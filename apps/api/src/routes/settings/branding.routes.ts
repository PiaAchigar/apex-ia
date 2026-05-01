import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";
import { databaseProvider } from "../../db/database-provider.js";
import { db } from "../../db/drizzle.js";
import { organizations } from "@apex-ia/database/schema/public";
import { BrandingService } from "../../services/BrandingService.js";
import { logger } from "../../utils/logger.js";

const updateBrandingSchema = z.object({
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  appName: z.string().optional(),
  whitelabelEnabled: z.boolean().optional(),
});

const updateDomainSchema = z.object({
  customDomain: z.string().nullable().optional(),
});

type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
type UpdateDomainInput = z.infer<typeof updateDomainSchema>;

async function verifyPlanBusiness(organizationId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ plan: organizations.plan })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return result[0]?.plan === "business";
  } catch (error) {
    logger.error({ organizationId, error }, "Error verifying plan");
    return false;
  }
}

export function createBrandingRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET / — Get branding config (no plan restriction)
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new BrandingService(tenantDb, db);
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

  // PUT / — Update branding (requires plan=business)
  router.put("/", zValidator("json", updateBrandingSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as UpdateBrandingInput;
    const tenantDb = databaseProvider.getClientDrizzle(organizationId);

    // Verify plan
    const isBusiness = await verifyPlanBusiness(organizationId);
    if (!isBusiness) {
      return c.json(
        {
          success: false,
          error: {
            code: "PLAN_REQUIRED",
            message: "White-label solo está disponible en el plan Business",
          },
        },
        403
      );
    }

    try {
      const service = new BrandingService(tenantDb, db);
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

  // PUT /domain — Update custom domain (requires plan=business)
  router.put("/domain", zValidator("json", updateDomainSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as UpdateDomainInput;

    // Verify plan
    const isBusiness = await verifyPlanBusiness(organizationId);
    if (!isBusiness) {
      return c.json(
        {
          success: false,
          error: {
            code: "PLAN_REQUIRED",
            message: "Dominio personalizado solo está disponible en el plan Business",
          },
        },
        403
      );
    }

    try {
      const tenantDb = databaseProvider.getClientDrizzle(organizationId);
      const service = new BrandingService(tenantDb, db);
      await service.updateDomain(organizationId, body.customDomain || null);
      return c.json({ success: true, data: { message: "Dominio actualizado" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error updating domain");
      return c.json(
        {
          success: false,
          error: { code: "DOMAIN_UPDATE_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  return router;
}
