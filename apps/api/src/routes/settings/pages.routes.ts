import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";
import { databaseProvider } from "../../db/database-provider.js";
import { PagesService } from "../../services/PagesService.js";
import { logger } from "../../utils/logger.js";

const createPageSchema = z.object({
  slug: z.string().min(1, "slug requerido").max(100),
  title: z.string().min(1, "title requerido").max(200),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const updatePageSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
});

type CreatePageInput = z.infer<typeof createPageSchema>;
type UpdatePageInput = z.infer<typeof updatePageSchema>;

export function createPagesRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET / — List pages
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new PagesService(tenantDb);
      const allPages = await service.listPages(organizationId);
      return c.json({ success: true, data: allPages });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error listing pages");
      return c.json(
        {
          success: false,
          error: { code: "PAGE_LIST_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // POST / — Create page
  router.post("/", zValidator("json", createPageSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as CreatePageInput;
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new PagesService(tenantDb);
      const newPage = await service.createPage(organizationId, body);
      return c.json({ success: true, data: newPage }, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error creating page");
      return c.json(
        {
          success: false,
          error: { code: "PAGE_CREATE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // PATCH /:id — Update page
  router.patch("/:id", zValidator("json", updatePageSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const pageId = c.req.param("id");
    const body = c.req.valid("json") as UpdatePageInput;
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new PagesService(tenantDb);
      const updated = await service.updatePage(pageId, organizationId, body);
      return c.json({ success: true, data: updated });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, pageId }, "Error updating page");
      return c.json(
        {
          success: false,
          error: { code: "PAGE_UPDATE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // DELETE /:id — Delete page
  router.delete("/:id", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const pageId = c.req.param("id");
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new PagesService(tenantDb);
      await service.deletePage(pageId, organizationId);
      return c.json({ success: true, data: { message: "Página eliminada" } }, 200 as never);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, pageId }, "Error deleting page");
      return c.json(
        {
          success: false,
          error: { code: "PAGE_DELETE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  return router;
}

// Public route — no auth required
export function createPublicPagesRoutes() {
  const router = new Hono();

  // GET /pages/public/:slug — Get published page
  router.get("/:organizationId/:slug", async (c) => {
    const organizationId = c.req.param("organizationId");
    const slug = c.req.param("slug");
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    try {
      const service = new PagesService(tenantDb);
      const page = await service.getPublicPage(organizationId, slug);

      if (!page) {
        return c.json(
          {
            success: false,
            error: { code: "PAGE_NOT_FOUND", message: "Página no encontrada" },
          },
          404
        );
      }

      return c.json({ success: true, data: page });
    } catch (error) {
      logger.error(
        { error, organizationId, slug },
        "Error fetching public page"
      );
      return c.json(
        {
          success: false,
          error: { code: "PAGE_NOT_FOUND", message: "Página no encontrada" },
        },
        404
      );
    }
  });

  return router;
}
