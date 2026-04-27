import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { organizationsDb } from "@apex-ia/database/schema/public";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 16;
const AUTH_TAG_BYTES = 16;

export class ClientDatabaseService {
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyHex = process.env["CLIENT_DB_ENCRYPTION_KEY"];
    if (!keyHex) throw new Error("CLIENT_DB_ENCRYPTION_KEY is required");
    this.encryptionKey = Buffer.from(keyHex, "hex");
    if (this.encryptionKey.length !== 32) {
      throw new Error("CLIENT_DB_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
    }
  }

  async storeDatabaseCredentials(
    organizationId: string,
    databaseUrl: string,
    supabaseProjectUrl?: string
  ): Promise<void> {
    const encryptedDatabaseUrl = this.encrypt(databaseUrl);

    // Upsert: if row exists, update it
    const existing = await db
      .select({ id: organizationsDb.id })
      .from(organizationsDb)
      .where(eq(organizationsDb.organizationId, organizationId))
      .limit(1);

    if (existing[0]) {
      await db
        .update(organizationsDb)
        .set({
          encryptedDatabaseUrl,
          supabaseProjectUrl: supabaseProjectUrl ?? null,
          databaseName: supabaseProjectUrl
            ? new URL(supabaseProjectUrl).hostname
            : "client-db",
          isActive: true,
          lastConnectionTest: new Date(),
          lastConnectionSuccess: true,
          updatedAt: new Date(),
        })
        .where(eq(organizationsDb.organizationId, organizationId));
    } else {
      await db.insert(organizationsDb).values({
        organizationId,
        encryptedDatabaseUrl,
        supabaseProjectUrl: supabaseProjectUrl ?? null,
        databaseName: supabaseProjectUrl
          ? new URL(supabaseProjectUrl).hostname
          : "client-db",
        isActive: true,
        lastConnectionTest: new Date(),
        lastConnectionSuccess: true,
      });
    }
  }

  async getClientDatabaseUrl(organizationId: string): Promise<string> {
    const [record] = await db
      .select({
        encryptedDatabaseUrl: organizationsDb.encryptedDatabaseUrl,
        isActive: organizationsDb.isActive,
      })
      .from(organizationsDb)
      .where(eq(organizationsDb.organizationId, organizationId))
      .limit(1);

    if (!record) throw new Error("CLIENT_DB_NOT_CONFIGURED");
    if (!record.isActive) throw new Error("CLIENT_DB_INACTIVE");

    return this.decrypt(record.encryptedDatabaseUrl);
  }

  async markConnectionResult(
    organizationId: string,
    success: boolean
  ): Promise<void> {
    await db
      .update(organizationsDb)
      .set({ lastConnectionTest: new Date(), lastConnectionSuccess: success })
      .where(eq(organizationsDb.organizationId, organizationId));
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) throw new Error("Invalid ciphertext format");

    const [ivHex, authTagHex, encrypted] = parts as [string, string, string];
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.encryptionKey,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
