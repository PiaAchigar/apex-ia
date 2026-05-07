import { eq, and } from "drizzle-orm";
import { pages } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export interface CreatePageInput {
  slug: string;
  title: string;
  content?: string | undefined;
  isPublished?: boolean | undefined;
}

export interface UpdatePageInput {
  title?: string | undefined;
  content?: string | undefined;
  isPublished?: boolean | undefined;
}

export type PageResponse = {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  content: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class PagesService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async listPages(organizationId: string): Promise<PageResponse[]> {
    try {
      const rows = await this.tenantDb
        .select()
        .from(pages)
        .where(eq(pages.organizationId, organizationId));

      return rows as PageResponse[];
    } catch (error) {
      logger.error({ organizationId, error }, "Error listing pages");
      throw new Error("PAGE_LIST_FAILED: No se pudieron obtener las páginas");
    }
  }

  async createPage(
    organizationId: string,
    input: CreatePageInput
  ): Promise<PageResponse> {
    try {
      const [newPage] = await this.tenantDb
        .insert(pages)
        .values({
          organizationId,
          slug: input.slug,
          title: input.title,
          content: input.content || null,
          isPublished: input.isPublished ?? false,
        })
        .returning();

      return newPage as PageResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error creating page");
      throw new Error(`PAGE_CREATE_FAILED: ${errorMessage}`);
    }
  }

  async updatePage(
    id: string,
    organizationId: string,
    input: UpdatePageInput
  ): Promise<PageResponse> {
    try {
      // Verify ownership
      const existing = await this.tenantDb
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.id, id), eq(pages.organizationId, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("PAGE_NOT_FOUND: Página no encontrada");
      }

      // Update
      const [updated] = await this.tenantDb
        .update(pages)
        .set({
          title: input.title,
          content: input.content,
          isPublished: input.isPublished,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, id))
        .returning();

      return updated as PageResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, pageId: id, error }, "Error updating page");
      throw new Error(`PAGE_UPDATE_FAILED: ${errorMessage}`);
    }
  }

  async deletePage(id: string, organizationId: string): Promise<void> {
    try {
      // Verify ownership
      const existing = await this.tenantDb
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.id, id), eq(pages.organizationId, organizationId)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("PAGE_NOT_FOUND: Página no encontrada");
      }

      // Delete
      await this.tenantDb.delete(pages).where(eq(pages.id, id));

      logger.info({ organizationId, pageId: id }, "Page deleted");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, pageId: id, error }, "Error deleting page");
      throw new Error(`PAGE_DELETE_FAILED: ${errorMessage}`);
    }
  }

  async getPublicPage(organizationId: string, slug: string): Promise<PageResponse | null> {
    try {
      const [page] = await this.tenantDb
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.organizationId, organizationId),
            eq(pages.slug, slug),
            eq(pages.isPublished, true)
          )
        )
        .limit(1);

      return (page as PageResponse) || null;
    } catch (error) {
      logger.error({ organizationId, slug, error }, "Error fetching public page");
      throw new Error("PAGE_NOT_FOUND: Página no encontrada");
    }
  }
}
