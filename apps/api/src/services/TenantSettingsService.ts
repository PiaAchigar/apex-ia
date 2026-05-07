import { eq, and } from "drizzle-orm";
import { tenantSettings } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export interface CustomCodeResponse {
  customCss: string | null;
  customJs: string | null;
}

export class TenantSettingsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async getCustomCode(organizationId: string): Promise<CustomCodeResponse> {
    try {
      const rows = await this.tenantDb
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.organizationId, organizationId));

      const cssRow = rows.find((r) => r.key === "customCss");
      const jsRow = rows.find((r) => r.key === "customJs");

      return {
        customCss: cssRow?.value || null,
        customJs: jsRow?.value || null,
      };
    } catch (error) {
      logger.error({ organizationId, error }, "Error fetching custom code");
      throw new Error("SETTINGS_GET_FAILED: No se pudieron obtener las configuraciones");
    }
  }

  async saveCustomCss(organizationId: string, css: string): Promise<void> {
    try {
      const [existingRecord] = await this.tenantDb
        .select({ id: tenantSettings.id })
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.organizationId, organizationId),
            eq(tenantSettings.key, "customCss")
          )
        )
        .limit(1);

      if (existingRecord) {
        // Update
        await this.tenantDb
          .update(tenantSettings)
          .set({
            value: css,
            updatedAt: new Date(),
          })
          .where(eq(tenantSettings.id, existingRecord.id));
      } else {
        // Insert
        await this.tenantDb.insert(tenantSettings).values({
          organizationId,
          key: "customCss",
          value: css,
        });
      }

      logger.info({ organizationId }, "Custom CSS saved");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error saving custom CSS");
      throw new Error(`SETTINGS_SAVE_CSS_FAILED: ${errorMessage}`);
    }
  }

  async saveCustomJs(organizationId: string, js: string): Promise<void> {
    try {
      const [existingRecord] = await this.tenantDb
        .select({ id: tenantSettings.id })
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.organizationId, organizationId),
            eq(tenantSettings.key, "customJs")
          )
        )
        .limit(1);

      if (existingRecord) {
        // Update
        await this.tenantDb
          .update(tenantSettings)
          .set({
            value: js,
            updatedAt: new Date(),
          })
          .where(eq(tenantSettings.id, existingRecord.id));
      } else {
        // Insert
        await this.tenantDb.insert(tenantSettings).values({
          organizationId,
          key: "customJs",
          value: js,
        });
      }

      logger.info({ organizationId }, "Custom JS saved");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error saving custom JS");
      throw new Error(`SETTINGS_SAVE_JS_FAILED: ${errorMessage}`);
    }
  }
}
