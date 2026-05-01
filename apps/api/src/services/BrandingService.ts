import { eq, and } from "drizzle-orm";
import { tenantSettings } from "@apex-ia/database/schema/tenant";
import { organizations } from "@apex-ia/database/schema/public";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  appName: string;
  customDomain: string | null;
  whitelabelEnabled: boolean;
}

export interface UpdateBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  appName?: string;
  whitelabelEnabled?: boolean;
}

const BRANDING_DEFAULTS = {
  primaryColor: "#10B981",
  accentColor: "#10B981",
  appName: "Apex IA",
};

export class BrandingService {
  constructor(
    private readonly tenantDb: DrizzleDb,
    private readonly publicDb: DrizzleDb
  ) {}

  async getBranding(organizationId: string): Promise<BrandingConfig> {
    try {
      // Get branding settings from tenant_settings
      const brandingRows = await this.tenantDb
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.organizationId, organizationId),
            eq(tenantSettings.key, "branding")
          )
        )
        .limit(1);

      let brandingData: Partial<BrandingConfig> = {};
      if (brandingRows.length > 0) {
        try {
          brandingData = JSON.parse(brandingRows[0].value || "{}");
        } catch {
          logger.warn({ organizationId }, "Failed to parse branding JSON");
        }
      }

      // Get customDomain and whitelabelEnabled from organizations
      const orgRows = await this.publicDb
        .select({
          customDomain: organizations.customDomain,
          whitelabelEnabled: organizations.whitelabelEnabled,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      const org = orgRows[0];

      return {
        logoUrl: brandingData.logoUrl || null,
        primaryColor: brandingData.primaryColor || BRANDING_DEFAULTS.primaryColor,
        accentColor: brandingData.accentColor || BRANDING_DEFAULTS.accentColor,
        appName: brandingData.appName || BRANDING_DEFAULTS.appName,
        customDomain: org?.customDomain || null,
        whitelabelEnabled: org?.whitelabelEnabled || false,
      };
    } catch (error) {
      logger.error({ organizationId, error }, "Error fetching branding");
      throw new Error("BRANDING_GET_FAILED: No se pudieron obtener las configuraciones de marca");
    }
  }

  async updateBranding(
    organizationId: string,
    input: UpdateBrandingInput
  ): Promise<void> {
    try {
      // Get existing branding settings
      const existing = await this.tenantDb
        .select({ id: tenantSettings.id })
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.organizationId, organizationId),
            eq(tenantSettings.key, "branding")
          )
        )
        .limit(1);

      // Merge with existing data
      let currentData: Partial<BrandingConfig> = {};
      if (existing.length > 0) {
        try {
          const existingRows = await this.tenantDb
            .select()
            .from(tenantSettings)
            .where(eq(tenantSettings.id, existing[0].id));
          currentData = JSON.parse(existingRows[0]?.value || "{}");
        } catch {
          logger.warn({ organizationId }, "Failed to parse existing branding");
        }
      }

      const mergedData = { ...currentData, ...input };
      const jsonValue = JSON.stringify(mergedData);

      if (existing.length > 0) {
        // Update
        await this.tenantDb
          .update(tenantSettings)
          .set({
            value: jsonValue,
            updatedAt: new Date(),
          })
          .where(eq(tenantSettings.id, existing[0].id));
      } else {
        // Insert
        await this.tenantDb.insert(tenantSettings).values({
          organizationId,
          key: "branding",
          value: jsonValue,
        });
      }

      logger.info({ organizationId }, "Branding settings updated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error updating branding");
      throw new Error(`BRANDING_UPDATE_FAILED: ${errorMessage}`);
    }
  }

  async updateDomain(organizationId: string, customDomain: string | null): Promise<void> {
    try {
      await this.publicDb
        .update(organizations)
        .set({
          customDomain,
        })
        .where(eq(organizations.id, organizationId));

      logger.info({ organizationId, customDomain }, "Custom domain updated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error updating custom domain");
      throw new Error(`DOMAIN_UPDATE_FAILED: ${errorMessage}`);
    }
  }

  async updateWhitelabelEnabled(
    organizationId: string,
    enabled: boolean
  ): Promise<void> {
    try {
      await this.publicDb
        .update(organizations)
        .set({
          whitelabelEnabled: enabled,
        })
        .where(eq(organizations.id, organizationId));

      logger.info({ organizationId, enabled }, "Whitelabel enabled updated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error updating whitelabel enabled");
      throw new Error(`WHITELABEL_UPDATE_FAILED: ${errorMessage}`);
    }
  }
}
