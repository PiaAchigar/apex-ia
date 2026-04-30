import { db } from "../db/drizzle.js";
import { apiKeys } from "@apex-ia/database/schema/public";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "apex_";
const API_KEY_RAW_LENGTH = 32; // bytes

export type ApiKeyPublic = {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export class ApiKeyService {
  async listApiKeys(organizationId: string): Promise<ApiKeyPublic[]> {
    try {
      const keys = await db
        .select({
          id: apiKeys.id,
          organizationId: apiKeys.organizationId,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.organizationId, organizationId));

      return keys;
    } catch (error) {
      logger.error({ error, organizationId }, "Failed to list API keys");
      throw new Error("API_KEY_LIST_FAILED: No se pudieron obtener las API keys");
    }
  }

  async generateApiKey(
    organizationId: string,
    name: string
  ): Promise<{ key: string; record: ApiKeyPublic }> {
    try {
      // Generate raw key: "apex_" + 32 random bytes in hex
      const randomPart = randomBytes(API_KEY_RAW_LENGTH).toString("hex");
      const rawKey = `${API_KEY_PREFIX}${randomPart}`;

      // Hash the key
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 8);

      // Store in database
      const [record] = await db
        .insert(apiKeys)
        .values({
          organizationId,
          name,
          keyHash,
          keyPrefix,
          isActive: true,
        })
        .returning({
          id: apiKeys.id,
          organizationId: apiKeys.organizationId,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        });

      logger.info(
        { organizationId, name, keyId: record.id },
        "API key generated"
      );

      return {
        key: rawKey, // Only returned once, never stored in plaintext
        record,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Failed to generate API key");
      throw new Error(`API_KEY_GENERATE_FAILED: ${errorMessage}`);
    }
  }

  async revokeApiKey(organizationId: string, keyId: string): Promise<void> {
    try {
      // Verify ownership
      const key = await db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(
          eq(apiKeys.id, keyId) &&
          eq(apiKeys.organizationId, organizationId)
        )
        .limit(1);

      if (key.length === 0) {
        throw new Error("KEY_NOT_FOUND: API key no encontrada");
      }

      // Revoke
      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(eq(apiKeys.id, keyId));

      logger.info({ organizationId, keyId }, "API key revoked");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, keyId }, "Failed to revoke API key");
      throw new Error(`API_KEY_REVOKE_FAILED: ${errorMessage}`);
    }
  }

  async validateApiKey(rawKey: string): Promise<{ organizationId: string } | null> {
    try {
      // Hash the provided key
      const providedHash = createHash("sha256").update(rawKey).digest("hex");

      // Lookup by hash
      const key = await db
        .select({
          id: apiKeys.id,
          organizationId: apiKeys.organizationId,
          isActive: apiKeys.isActive,
        })
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, providedHash))
        .limit(1);

      if (key.length === 0 || !key[0].isActive) {
        return null;
      }

      // Update lastUsedAt
      try {
        await db
          .update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, key[0].id));
      } catch (updateError) {
        // Log but don't fail if update fails
        logger.warn(
          { error: updateError, keyId: key[0].id },
          "Failed to update lastUsedAt"
        );
      }

      return { organizationId: key[0].organizationId };
    } catch (error) {
      logger.error({ error }, "Failed to validate API key");
      throw new Error("API_KEY_VALIDATE_FAILED: Error validando API key");
    }
  }
}
