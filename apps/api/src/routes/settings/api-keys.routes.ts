import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { ApiKeyService } from "../../services/ApiKeyService.js";
import { logger } from "../../utils/logger.js";

const generateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
});

type GenerateInput = z.infer<typeof generateSchema>;

export function createApiKeyRoutes() {
  const router = new Hono();
  const apiKeyService = new ApiKeyService();

  router.use("*", authMiddleware);

  // GET / — List API keys
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;

    try {
      const keys = await apiKeyService.listApiKeys(organizationId);
      return c.json({ success: true, data: keys });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error listing API keys");
      return c.json(
        {
          success: false,
          error: { code: "API_KEY_LIST_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // POST / — Generate new API key
  router.post("/", zValidator("json", generateSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as GenerateInput;

    try {
      const result = await apiKeyService.generateApiKey(organizationId, body.name);
      return c.json(
        { success: true, data: { key: result.key, record: result.record } },
        201
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error generating API key");
      return c.json(
        {
          success: false,
          error: { code: "API_KEY_GENERATE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // DELETE /:id — Revoke API key
  router.delete("/:id", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const keyId = c.req.param("id");

    try {
      await apiKeyService.revokeApiKey(organizationId, keyId);
      return c.json({ success: true, data: { message: "API key revocada" } }, 200 as never);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, keyId }, "Error revoking API key");
      return c.json(
        {
          success: false,
          error: { code: "API_KEY_REVOKE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  return router;
}
