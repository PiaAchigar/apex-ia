import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";
import { db } from "../../db/drizzle.js";
import { BrandingService } from "../../services/BrandingService.js";
import { logger } from "../../utils/logger.js";

const updateBrandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  faviconUrl: z.string().url().optional().nullable(),
});

type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

export function createBrandingRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET / — Get branding config
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;

    try {
      const service = new BrandingService(db);
      const branding = await service.getBranding(organizationId);
      return c.json({ success: true, data: branding });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error fetching branding");
      return c.json(
        {
          success: false,
          error: { code: "BRANDING_GET_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // PUT / — Update branding (all plans allowed)
  router.put("/", zValidator("json", updateBrandingSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as UpdateBrandingInput;

    try {
      const service = new BrandingService(db);
      await service.updateBranding(organizationId, body);
      return c.json({ success: true, data: { message: "Branding actualizado" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error updating branding");
      return c.json(
        {
          success: false,
          error: { code: "BRANDING_UPDATE_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  return router;
}
