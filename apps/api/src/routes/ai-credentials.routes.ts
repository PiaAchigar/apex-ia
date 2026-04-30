import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { databaseProvider } from "../db/database-provider.js";
import { AiCredentialsService } from "../services/AiCredentialsService.js";
import { logger } from "../utils/logger.js";

const createCredentialSchema = z.object({
  provider: z.enum(["anthropic", "openai", "gemini", "openrouter"]),
  apiKey: z.string().min(1, "API key es requerida"),
  isPrimary: z.boolean().optional(),
});

const updateCredentialSchema = z.object({
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const setApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key es requerida"),
});

export function createAiCredentialsRoutes() {
  const router = new Hono<{ Bindings: Record<string, unknown> }>();

  router.use(authMiddleware);
  router.use(tenantMiddleware);

  /**
   * GET /settings/ai-credentials
   * List all AI credentials for the organization
   */
  router.get("/", async (c) => {
    try {
      const organizationId = c.get("organizationId");
      if (!organizationId) {
        return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
      }

      const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
      const service = new AiCredentialsService(tenantDb);

      const credentials = await service.listCredentials(organizationId);

      return c.json({ success: true, data: credentials }, 200);
    } catch (error) {
      logger.error({ error }, "Error listing AI credentials");
      return c.json(
        { success: false, error: { code: "AI_CREDENTIALS_LIST_FAILED", message: "Failed to list credentials" } },
        500
      );
    }
  });

  /**
   * POST /settings/ai-credentials
   * Create a new AI credential
   */
  router.post("/", zValidator("json", createCredentialSchema), async (c) => {
    try {
      const organizationId = c.get("organizationId");
      if (!organizationId) {
        return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
      }

      const body = c.req.valid("json");
      const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
      const service = new AiCredentialsService(tenantDb);

      const credential = await service.createCredential(organizationId, {
        provider: body.provider,
        apiKey: body.apiKey,
        isPrimary: body.isPrimary ?? false,
      });

      return c.json({ success: true, data: credential }, 201);
    } catch (error) {
      logger.error({ error }, "Error creating AI credential");
      return c.json(
        { success: false, error: { code: "AI_CREDENTIAL_CREATE_FAILED", message: "Failed to create credential" } },
        500
      );
    }
  });

  /**
   * PATCH /settings/ai-credentials/:id
   * Update AI credential (isPrimary, isActive)
   */
  router.patch("/:id", zValidator("json", updateCredentialSchema), async (c) => {
    try {
      const organizationId = c.get("organizationId");
      if (!organizationId) {
        return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
      }

      const id = c.req.param("id");
      const body = c.req.valid("json");

      const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
      const service = new AiCredentialsService(tenantDb);

      const updateInput: { isPrimary?: boolean; isActive?: boolean } = {};
      if (body.isPrimary !== undefined) updateInput.isPrimary = body.isPrimary;
      if (body.isActive !== undefined) updateInput.isActive = body.isActive;

      try {
        const credential = await service.updateCredential(id, organizationId, updateInput);
        return c.json({ success: true, data: credential }, 200);
      } catch (error) {
        if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "AI_CREDENTIAL_NOT_FOUND", message: "Credential not found" } },
            404
          );
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error }, "Error updating AI credential");
      return c.json(
        { success: false, error: { code: "AI_CREDENTIAL_UPDATE_FAILED", message: "Failed to update credential" } },
        500
      );
    }
  });

  /**
   * DELETE /settings/ai-credentials/:id
   * Delete AI credential
   */
  router.delete("/:id", async (c) => {
    try {
      const organizationId = c.get("organizationId");
      if (!organizationId) {
        return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
      }

      const id = c.req.param("id");
      const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
      const service = new AiCredentialsService(tenantDb);

      try {
        await service.deleteCredential(id, organizationId);
        return c.body(null, 204);
      } catch (error) {
        if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "AI_CREDENTIAL_NOT_FOUND", message: "Credential not found" } },
            404
          );
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error }, "Error deleting AI credential");
      return c.json(
        { success: false, error: { code: "AI_CREDENTIAL_DELETE_FAILED", message: "Failed to delete credential" } },
        500
      );
    }
  });

  /**
   * POST /settings/ai-credentials/:id/key
   * Update API key for a credential
   */
  router.post("/:id/key", zValidator("json", setApiKeySchema), async (c) => {
    try {
      const organizationId = c.get("organizationId");
      if (!organizationId) {
        return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
      }

      const id = c.req.param("id");
      const body = c.req.valid("json");

      const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
      const service = new AiCredentialsService(tenantDb);

      try {
        const credential = await service.setApiKey(id, organizationId, body.apiKey);
        return c.json({ success: true, data: credential }, 200);
      } catch (error) {
        if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "AI_CREDENTIAL_NOT_FOUND", message: "Credential not found" } },
            404
          );
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error }, "Error updating API key");
      return c.json(
        { success: false, error: { code: "AI_CREDENTIAL_KEY_UPDATE_FAILED", message: "Failed to update key" } },
        500
      );
    }
  });

  return router;
}
