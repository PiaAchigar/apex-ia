import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as publicSchema from "@apex-ia/database/schema/public";
import * as tenantSchema from "@apex-ia/database/schema/tenant";

function createDrizzleClient(schemaName?: string) {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");

  const searchPath = schemaName ? `${schemaName},public` : "public";

  const client = postgres(url, {
    prepare: false,
    connection: {
      search_path: searchPath,
    },
  });

  return drizzle(client, {
    schema: { ...publicSchema, ...tenantSchema },
  });
}

export const db = createDrizzleClient();

export function createTenantDb(tenantSchema: string) {
  return createDrizzleClient(tenantSchema);
}

export type DrizzleDb = ReturnType<typeof createDrizzleClient>;
