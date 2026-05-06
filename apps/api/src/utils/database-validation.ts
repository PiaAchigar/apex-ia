import postgres from "postgres";
import { logger } from "./logger.js";

const SUPABASE_HOST_PATTERN = /(supabase\.co|pooler\.supabase\.com)$/;
const POSTGRES_PROTOCOL_PATTERN = /^postgresql:\/\//;

export interface DatabaseValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateClientDatabaseUrl(
  databaseUrl: string
): Promise<DatabaseValidationResult> {
  // 1. Must be a postgres URL
  if (!POSTGRES_PROTOCOL_PATTERN.test(databaseUrl)) {
    return { valid: false, error: "La URL debe ser una conexión PostgreSQL (postgresql://...)" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    return { valid: false, error: "Formato de URL inválido" };
  }

  // 2. Must be Supabase host
  if (!SUPABASE_HOST_PATTERN.test(parsedUrl.hostname)) {
    return { valid: false, error: "La URL debe ser de un proyecto Supabase (*.supabase.co)" };
  }

  // 3. Try actual connection
  let client: postgres.Sql | null = null;
  try {
    const isPooler = parsedUrl.hostname?.includes('pooler');
    const clientOptions: any = {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 5,
    };

    if (isPooler) {
      clientOptions.ssl = 'require';
    }

    client = postgres(databaseUrl, clientOptions);

    await client`SELECT 1`;

    return { valid: true };
  } catch (error) {
    logger.warn({ error: (error as Error).message }, "Client DB validation failed");
    return { valid: false, error: "No se pudo conectar. Verificá la URL y la contraseña." };
  } finally {
    if (client) await client.end({ timeout: 3 }).catch(() => {});
  }
}

export function validateSupabaseProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /supabase\.co$/.test(parsed.hostname) && parsed.protocol === "https:";
  } catch {
    return false;
  }
}
