import { eq, and } from "drizzle-orm";
import { aiCredentials } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { encryptCredentials, decryptCredentials } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

export interface AiCredentialInput {
  provider: "anthropic" | "openai" | "gemini" | "openrouter";
  apiKey: string;
  isPrimary?: boolean | undefined;
}

export interface AiCredentialResponse {
  id: string;
  provider: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export class AiCredentialsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async listCredentials(organizationId: string): Promise<AiCredentialResponse[]> {
    try {
      const rows = await this.tenantDb
        .select()
        .from(aiCredentials)
        .where(eq(aiCredentials.organizationId, organizationId));

      return rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        isPrimary: row.isPrimary ?? false,
        isActive: row.isActive ?? true,
        createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error({ organizationId, error }, "Error listing AI credentials");
      throw new Error("AI_CREDENTIALS_LIST_FAILED");
    }
  }

  async createCredential(
    organizationId: string,
    input: AiCredentialInput
  ): Promise<AiCredentialResponse> {
    try {
      const encryptedKey = encryptCredentials(input.apiKey);

      const result = await this.tenantDb
        .insert(aiCredentials)
        .values({
          organizationId,
          provider: input.provider,
          encryptedApiKey: encryptedKey,
          isPrimary: input.isPrimary ?? false,
          isActive: true,
        })
        .returning();

      const created = result[0];
      if (!created) {
        throw new Error("Failed to create credential");
      }

      return {
        id: created.id,
        provider: created.provider,
        isPrimary: created.isPrimary ?? false,
        isActive: created.isActive ?? true,
        createdAt: created.createdAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ organizationId, error }, "Error creating AI credential");
      throw new Error("AI_CREDENTIAL_CREATE_FAILED");
    }
  }

  async updateCredential(
    id: string,
    organizationId: string,
    input: { isPrimary?: boolean; isActive?: boolean }
  ): Promise<AiCredentialResponse> {
    try {
      const updates: Record<string, unknown> = {};
      if (input.isPrimary !== undefined) {
        updates.isPrimary = input.isPrimary;
      }
      if (input.isActive !== undefined) {
        updates.isActive = input.isActive;
      }

      const result = await this.tenantDb
        .update(aiCredentials)
        .set(updates)
        .where(and(eq(aiCredentials.id, id), eq(aiCredentials.organizationId, organizationId)))
        .returning();

      const updated = result[0];
      if (!updated) {
        throw new Error("AI_CREDENTIAL_NOT_FOUND");
      }

      return {
        id: updated.id,
        provider: updated.provider,
        isPrimary: updated.isPrimary ?? false,
        isActive: updated.isActive ?? true,
        createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
        throw error;
      }
      logger.error({ id, organizationId, error }, "Error updating AI credential");
      throw new Error("AI_CREDENTIAL_UPDATE_FAILED");
    }
  }

  async setApiKey(
    id: string,
    organizationId: string,
    newApiKey: string
  ): Promise<AiCredentialResponse> {
    try {
      const encryptedKey = encryptCredentials(newApiKey);

      const result = await this.tenantDb
        .update(aiCredentials)
        .set({ encryptedApiKey: encryptedKey })
        .where(and(eq(aiCredentials.id, id), eq(aiCredentials.organizationId, organizationId)))
        .returning();

      const updated = result[0];
      if (!updated) {
        throw new Error("AI_CREDENTIAL_NOT_FOUND");
      }

      return {
        id: updated.id,
        provider: updated.provider,
        isPrimary: updated.isPrimary ?? false,
        isActive: updated.isActive ?? true,
        createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
        throw error;
      }
      logger.error({ id, organizationId, error }, "Error updating API key");
      throw new Error("AI_CREDENTIAL_KEY_UPDATE_FAILED");
    }
  }

  async deleteCredential(id: string, organizationId: string): Promise<void> {
    try {
      const result = await this.tenantDb
        .delete(aiCredentials)
        .where(and(eq(aiCredentials.id, id), eq(aiCredentials.organizationId, organizationId)))
        .returning();

      if (!result.length) {
        throw new Error("AI_CREDENTIAL_NOT_FOUND");
      }
    } catch (error) {
      if ((error as Error).message === "AI_CREDENTIAL_NOT_FOUND") {
        throw error;
      }
      logger.error({ id, organizationId, error }, "Error deleting AI credential");
      throw new Error("AI_CREDENTIAL_DELETE_FAILED");
    }
  }
}
