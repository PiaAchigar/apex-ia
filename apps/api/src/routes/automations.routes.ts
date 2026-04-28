import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { supabaseAdmin } from "../db/supabase-admin.js";
import { AutomationService } from "../services/AutomationService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { logger } from "../utils/logger.js";

const toggleAutomationSchema = z.object({
  isActive: z.boolean(),
});

export function createAutomationsRoutes() {
  const routes = new Hono();

  routes.use("*", authMiddleware);
  routes.use("*", tenantMiddleware);

  // GET /settings/automations - List automations
  routes.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");

    const service = new AutomationService(tenantDb, supabaseAdmin);

    try {
      const list = await service.listAutomations();
      return c.json({ success: true, data: list });
    } catch (err) {
      logger.error(err, "Failed to list automations");
      return c.json(
        { success: false, error: { code: "LIST_FAILED", message: "Error listing automations" } },
        500
      );
    }
  });

  // POST /settings/automations/upload - Upload automation file
  routes.post("/upload", async (c) => {
    const tenantDb = c.get("tenantDb");
    const auth = c.get("auth");

    try {
      const formData = await c.req.formData();
      const nameField = formData.get("name");
      const typeField = formData.get("type");
      const fileField = formData.get("file");

      // Validate inputs
      if (!nameField || typeof nameField !== "string") {
        return c.json(
          { success: false, error: { code: "MISSING_NAME", message: "Name is required" } },
          400
        );
      }

      if (!typeField || typeof typeField !== "string") {
        return c.json(
          { success: false, error: { code: "MISSING_TYPE", message: "Type is required" } },
          400
        );
      }

      if (typeField !== "python" && typeField !== "json") {
        return c.json(
          {
            success: false,
            error: { code: "INVALID_TYPE", message: "Type must be 'python' or 'json'" },
          },
          400
        );
      }

      if (!fileField || !(fileField instanceof File)) {
        return c.json(
          { success: false, error: { code: "MISSING_FILE", message: "File is required" } },
          400
        );
      }

      // Validate file extension
      const fileName = fileField.name.toLowerCase();
      const validExt = typeField === "python" ? ".py" : ".json";
      if (!fileName.endsWith(validExt)) {
        return c.json(
          {
            success: false,
            error: {
              code: "INVALID_FILE_EXT",
              message: `File must have ${validExt} extension`,
            },
          },
          400
        );
      }

      // Validate file size (max 500KB)
      if (fileField.size > 500 * 1024) {
        return c.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: "File size must be <= 500KB" } },
          400
        );
      }

      const fileContent = await fileField.text();

      const service = new AutomationService(tenantDb, supabaseAdmin);
      const created = await service.uploadAutomation(
        nameField,
        typeField as "python" | "json",
        fileContent,
        auth.organizationId
      );

      return c.json({ success: true, data: created }, 201);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      if (errMsg === "INVALID_AUTOMATION_TYPE") {
        return c.json(
          { success: false, error: { code: "INVALID_TYPE", message: "Invalid automation type" } },
          400
        );
      }

      if (errMsg === "EMPTY_FILE_CONTENT") {
        return c.json(
          { success: false, error: { code: "EMPTY_FILE", message: "File content cannot be empty" } },
          400
        );
      }

      if (errMsg === "FILE_UPLOAD_FAILED") {
        return c.json(
          { success: false, error: { code: "UPLOAD_FAILED", message: "Failed to upload file" } },
          500
        );
      }

      logger.error(err, "Automation upload failed");
      return c.json(
        { success: false, error: { code: "UPLOAD_ERROR", message: "Error uploading automation" } },
        500
      );
    }
  });

  // POST /settings/automations/:id/execute - Execute automation
  routes.post("/:id/execute", async (c) => {
    const { id } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const service = new AutomationService(tenantDb, supabaseAdmin);

    try {
      const result = await service.executeAutomation(id);

      if (result.success) {
        return c.json({ success: true, data: { output: result.output } });
      } else {
        return c.json(
          {
            success: false,
            error: { code: "EXECUTION_FAILED", message: result.error ?? "Execution failed" },
          },
          500
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      if (errMsg === "AUTOMATION_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "NOT_FOUND", message: "Automation not found" } },
          404
        );
      }

      logger.error(err, "Automation execution failed");
      return c.json(
        { success: false, error: { code: "EXECUTE_ERROR", message: "Error executing automation" } },
        500
      );
    }
  });

  // PATCH /settings/automations/:id - Toggle automation active status
  routes.patch("/:id", zValidator("json", toggleAutomationSchema), async (c) => {
    const { id } = c.req.param();
    const { isActive } = c.req.valid("json");
    const tenantDb = c.get("tenantDb");
    
    const service = new AutomationService(tenantDb, supabaseAdmin);

    try {
      const updated = await service.toggleAutomation(id, isActive);
      return c.json({ success: true, data: updated });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      if (errMsg === "AUTOMATION_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "NOT_FOUND", message: "Automation not found" } },
          404
        );
      }

      logger.error(err, "Automation toggle failed");
      return c.json(
        { success: false, error: { code: "TOGGLE_ERROR", message: "Error toggling automation" } },
        500
      );
    }
  });

  // DELETE /settings/automations/:id - Delete automation
  routes.delete("/:id", async (c) => {
    const { id } = c.req.param();
    const tenantDb = c.get("tenantDb");
    
    const service = new AutomationService(tenantDb, supabaseAdmin);

    try {
      await service.deleteAutomation(id);
      return c.json({ success: true, deleted: true }, { status: 204 as any });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      if (errMsg === "AUTOMATION_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "NOT_FOUND", message: "Automation not found" } },
          404
        );
      }

      logger.error(err, "Automation deletion failed");
      return c.json(
        { success: false, error: { code: "DELETE_ERROR", message: "Error deleting automation" } },
        500
      );
    }
  });

  return routes;
}
