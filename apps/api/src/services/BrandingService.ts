import { eq } from "drizzle-orm";
import { organizations } from "@apex-ia/database/schema/public";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  faviconUrl: string | null;
}

export interface UpdateBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  faviconUrl?: string | null;
}

const BRANDING_DEFAULTS = {
  primaryColor: "#10B981",
  accentColor: "#10B981",
};

export class BrandingService {
  constructor(private readonly publicDb: DrizzleDb) {}

  async getBranding(organizationId: string): Promise<BrandingConfig> {
    try {
      const orgRows = await this.publicDb
        .select({
          logoUrl: organizations.logoUrl,
          primaryColor: organizations.primaryColor,
          accentColor: organizations.accentColor,
          faviconUrl: organizations.faviconUrl,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      const org = orgRows[0];
      if (!org) {
        throw new Error("Organization not found");
      }

      return {
        logoUrl: org.logoUrl || null,
        primaryColor: org.primaryColor || BRANDING_DEFAULTS.primaryColor,
        accentColor: org.accentColor || BRANDING_DEFAULTS.accentColor,
        faviconUrl: org.faviconUrl || null,
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
      const updateData: Record<string, any> = {};

      if (input.logoUrl !== undefined) {
        updateData.logoUrl = input.logoUrl;
      }
      if (input.primaryColor !== undefined) {
        updateData.primaryColor = input.primaryColor;
      }
      if (input.accentColor !== undefined) {
        updateData.accentColor = input.accentColor;
      }
      if (input.faviconUrl !== undefined) {
        updateData.faviconUrl = input.faviconUrl;
      }

      await this.publicDb
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, organizationId));

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
