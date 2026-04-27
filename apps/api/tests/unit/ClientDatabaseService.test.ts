import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClientDatabaseService } from "../../src/services/ClientDatabaseService.js";

describe("ClientDatabaseService", () => {
  let service: ClientDatabaseService;

  beforeEach(() => {
    // Valid 32-byte hex string (64 chars)
    process.env["CLIENT_DB_ENCRYPTION_KEY"] = "a".repeat(64);
    service = new ClientDatabaseService();
  });

  describe("constructor", () => {
    it("debería lanzar error si CLIENT_DB_ENCRYPTION_KEY no está configurada", () => {
      delete process.env["CLIENT_DB_ENCRYPTION_KEY"];

      expect(() => new ClientDatabaseService()).toThrow("CLIENT_DB_ENCRYPTION_KEY is required");
    });

    it("debería lanzar error si la clave no tiene 32 bytes (64 chars hex)", () => {
      process.env["CLIENT_DB_ENCRYPTION_KEY"] = "a".repeat(60); // 60 chars = 30 bytes

      expect(() => new ClientDatabaseService()).toThrow("must be 32 bytes");
    });
  });

  describe("encrypt/decrypt", () => {
    it("debería encriptar y desencriptar un texto correctamente (round-trip)", () => {
      const plaintext = "postgresql://user:password@db.supabase.co:5432/postgres";

      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("debería generar diferentes ciphertexts para el mismo plaintext (IV aleatorio)", () => {
      const plaintext = "postgresql://user:password@db.supabase.co:5432/postgres";

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("debería lanzar error al desencriptar ciphertext con formato inválido", () => {
      expect(() => service.decrypt("invalid")).toThrow("Invalid ciphertext format");
      expect(() => service.decrypt("a:b")).toThrow("Invalid ciphertext format");
    });

    it("debería lanzar error al desencriptar con authTag incorrecto", () => {
      const plaintext = "test";
      const encrypted = service.encrypt(plaintext);
      const [iv, _, text] = encrypted.split(":");
      const corruptedCiphertext = `${iv}:0000000000000000000000000000000:${text}`;

      expect(() => service.decrypt(corruptedCiphertext)).toThrow();
    });
  });
});
