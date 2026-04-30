import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";
import { databaseProvider } from "../../db/database-provider.js";
import { TenantSettingsService } from "../../services/TenantSettingsService.js";
import { logger } from "../../utils/logger.js";

const saveCssSchema = z.object({
  css: z.string(),
});

const saveJsSchema = z.object({
  js: z.string(),
});

type SaveCssInput = z.infer<typeof saveCssSchema>;
type SaveJsInput = z.infer<typeof saveJsSchema>;

export function createCustomCodeRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET / — Get custom CSS and JS
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new TenantSettingsService(tenantDb);
      const customCode = await service.getCustomCode(organizationId);
      return c.json({ success: true, data: customCode });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error fetching custom code");
      return c.json(
        {
          success: false,
          error: { code: "SETTINGS_GET_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // PUT /css — Save custom CSS
  router.put("/css", zValidator("json", saveCssSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as SaveCssInput;
    const tenantDb = databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new TenantSettingsService(tenantDb);
      await service.saveCustomCss(organizationId, body.css);
      return c.json({ success: true, data: { message: "CSS guardado" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error saving custom CSS");
      return c.json(
        {
          success: false,
          error: { code: "SETTINGS_SAVE_CSS_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // PUT /js — Save custom JS
  router.put("/js", zValidator("json", saveJsSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as SaveJsInput;
    const tenantDb = databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new TenantSettingsService(tenantDb);
      await service.saveCustomJs(organizationId, body.js);
      return c.json({ success: true, data: { message: "JS guardado" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error saving custom JS");
      return c.json(
        {
          success: false,
          error: { code: "SETTINGS_SAVE_JS_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  return router;
}
