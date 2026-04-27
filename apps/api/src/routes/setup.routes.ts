import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { sensitiveRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";
import { ClientDatabaseService } from "../services/ClientDatabaseService.js";
import { databaseProvider } from "../db/database-provider.js";
import {
  validateClientDatabaseUrl,
  validateSupabaseProjectUrl,
} from "../utils/database-validation.js";
import { db } from "../db/drizzle.js";
import { organizations, auditLogs } from "@apex-ia/database/schema/public";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_SCHEMA_SQL = resolve(
  __dirname,
  "../../../../packages/database/migrations/0001_client_schema.sql"
);

const CLIENT_TABLE_NAMES = [
  "contacts",
  "conversations",
  "messages",
  "pipelines",
  "pipeline_stages",
  "deals",
  "tasks",
  "flows",
  "campaigns",
  "templates",
  "channel_credentials",
  "call_logs",
  "analytics_events",
  "n8m_workflows",
] as const;

const validateDbSchema = z.object({
  databaseUrl: z.string().min(1, "Database URL requerida"),
  supabaseProjectUrl: z.string().url().optional(),
});

export function createSetupRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);

  // POST /setup/validate-database
  router.post(
    "/validate-database",
    sensitiveRateLimitMiddleware,
    zValidator("json", validateDbSchema),
    async (c) => {
      const { databaseUrl, supabaseProjectUrl } = c.req.valid("json");

      if (supabaseProjectUrl && !validateSupabaseProjectUrl(supabaseProjectUrl)) {
        return c.json(
          {
            success: false,
            error: { code: "INVALID_URL", message: "URL de proyecto Supabase inválida" },
          },
          400
        );
      }

      const result = await validateClientDatabaseUrl(databaseUrl);
      if (!result.valid) {
        return c.json(
          { success: false, error: { code: "INVALID_DB", message: result.error } },
          400
        );
      }

      return c.json({ success: true, data: { message: "Conexión válida ✅" } });
    }
  );

  // POST /setup/initialize-schema
  router.post(
    "/initialize-schema",
    sensitiveRateLimitMiddleware,
    zValidator("json", validateDbSchema),
    async (c) => {
      const { databaseUrl, supabaseProjectUrl } = c.req.valid("json");
      const { organizationId, userId } = c.get("auth");

      const validationResult = await validateClientDatabaseUrl(databaseUrl);
      if (!validationResult.valid) {
        return c.json(
          { success: false, error: { code: "INVALID_DB", message: validationResult.error } },
          400
        );
      }

      const clientDbService = new ClientDatabaseService();

      try {
        await clientDbService.storeDatabaseCredentials(
          organizationId,
          databaseUrl,
          supabaseProjectUrl
        );

        databaseProvider.invalidate(organizationId);

        await runClientSchemaMigrations(databaseUrl);

        await db.insert(auditLogs).values({
          userId,
          action: "organization.client_db_connected",
          resourceType: "organization",
          resourceId: organizationId,
          newValuesJson: { tablesCreated: CLIENT_TABLE_NAMES.length },
        });

        logger.info({ organizationId }, "Client DB schema initialized");

        return c.json({
          success: true,
          data: { tablesCreated: [...CLIENT_TABLE_NAMES] },
        });
      } catch (error) {
        logger.error(
          { organizationId, error: (error as Error).message },
          "Schema initialization failed"
        );
        return c.json(
          { success: false, error: { code: "INIT_FAILED", message: "Error al inicializar el schema" } },
          500
        );
      }
    }
  );

  // POST /setup/complete
  router.post("/complete", async (c) => {
    const { organizationId, userId } = c.get("auth");

    await db
      .update(organizations)
      .set({ setupCompletedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    await db.insert(auditLogs).values({
      userId,
      action: "organization.setup_completed",
      resourceType: "organization",
      resourceId: organizationId,
    });

    logger.info({ organizationId }, "Setup completed");

    return c.json({ success: true, data: { message: "Setup completado ✅" } });
  });

  // GET /setup/status
  router.get("/status", async (c) => {
    const { organizationId } = c.get("auth");

    const [org] = await db
      .select({
        setupCompletedAt: organizations.setupCompletedAt,
        paidAt: organizations.paidAt,
        plan: organizations.plan,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return c.json({ success: false, error: { code: "ORG_NOT_FOUND" } }, 404);
    }

    return c.json({
      success: true,
      data: {
        isComplete: !!org.setupCompletedAt,
        paidAt: org.paidAt,
        plan: org.plan,
      },
    });
  });

  return router;
}

async function runClientSchemaMigrations(databaseUrl: string): Promise<void> {
  const sql = await readFile(CLIENT_SCHEMA_SQL, "utf-8");

  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
  });

  try {
    await client.unsafe(sql);
  } finally {
    await client.end({ timeout: 3 }).catch(() => {});
  }
}
