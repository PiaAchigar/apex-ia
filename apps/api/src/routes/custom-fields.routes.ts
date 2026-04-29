import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { CustomFieldsService } from "../services/CustomFieldsService.js";
import { logger } from "../utils/logger.js";

const createFieldSchema = z.object({
  entityType: z.enum(["contact", "deal"]),
  fieldKey: z.string().min(1, "Field key required"),
  label: z.string().min(1, "Label required"),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

const updateFieldSchema = z.object({
  label: z.string().optional(),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]).optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export function createCustomFieldsRoutes() {
  const router = new Hono<{ Bindings: Record<string, unknown> }>();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET /settings/custom-fields?entityType=contact|deal - List field definitions
  router.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");
    const entityType = c.req.query("entityType") as "contact" | "deal" | undefined;

    if (!entityType || !["contact", "deal"].includes(entityType)) {
      return c.json(
        {
          success: false,
          error: { code: "INVALID_QUERY", message: "entityType must be 'contact' or 'deal'" },
        },
        400
      );
    }

    try {
      const service = new CustomFieldsService(tenantDb);
      const fields = await service.listFieldDefinitions(entityType);

      return c.json({
        success: true,
        data: fields,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to list custom fields");
      throw error;
    }
  });

  // POST /settings/custom-fields - Create a new field definition
  router.post("/", zValidator("json", createFieldSchema), async (c) => {
    const tenantDb = c.get("tenantDb");
    const input = c.req.valid("json");

    try {
      const service = new CustomFieldsService(tenantDb);
      const field = await service.createFieldDefinition(input);

      return c.json(
        {
          success: true,
          data: field,
        },
        201
      );
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to create custom field");
      throw error;
    }
  });

  // PATCH /settings/custom-fields/:fieldId - Update a field definition
  router.patch("/:fieldId", zValidator("json", updateFieldSchema), async (c) => {
    const tenantDb = c.get("tenantDb");
    const fieldId = c.req.param("fieldId");
    const input = c.req.valid("json");

    try {
      const service = new CustomFieldsService(tenantDb);
      const field = await service.updateFieldDefinition(fieldId, input);

      return c.json({
        success: true,
        data: field,
      });
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes("not found")) {
        return c.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Custom field not found" },
          },
          404
        );
      }

      logger.error({ fieldId, error: errorMsg }, "Failed to update custom field");
      throw error;
    }
  });

  // DELETE /settings/custom-fields/:fieldId - Delete (soft-delete) a field definition
  router.delete("/:fieldId", async (c) => {
    const tenantDb = c.get("tenantDb");
    const fieldId = c.req.param("fieldId");

    try {
      const service = new CustomFieldsService(tenantDb);
      await service.deleteFieldDefinition(fieldId);

      return c.json({
        success: true,
        data: { deleted: true, fieldId },
      });
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes("not found")) {
        return c.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Custom field not found" },
          },
          404
        );
      }

      logger.error({ fieldId, error: errorMsg }, "Failed to delete custom field");
      throw error;
    }
  });

  return router;
}
