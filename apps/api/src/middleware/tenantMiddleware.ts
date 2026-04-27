import type { MiddlewareHandler } from "hono";
import { databaseProvider, type ClientDrizzleDb } from "../db/database-provider.js";
import { logger } from "../utils/logger.js";

declare module "hono" {
  interface ContextVariableMap {
    tenantDb: ClientDrizzleDb;
    organizationId: string;
    orgSlug: string;
  }
}

export const tenantMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.get("auth");
  if (!auth?.organizationId) {
    return c.json(
      { success: false, error: { code: "MISSING_TENANT", message: "Organización no identificada" } },
      400
    );
  }

  const { organizationId, organizationSlug } = auth;

  let clientDb: ClientDrizzleDb;
  try {
    clientDb = await databaseProvider.getClientDrizzle(organizationId);
  } catch (error) {
    const message = (error as Error).message;

    if (message === "CLIENT_DB_NOT_CONFIGURED" || message === "CLIENT_DB_INACTIVE") {
      return c.json(
        {
          success: false,
          error: {
            code: "SETUP_REQUIRED",
            message: "Configurá tu base de datos en /setup antes de continuar.",
          },
        },
        403
      );
    }

    logger.error({ organizationId, error: message }, "Failed to resolve client DB");
    return c.json(
      { success: false, error: { code: "DB_CONNECTION_ERROR", message: "Error de conexión a la base de datos" } },
      503
    );
  }

  c.set("tenantDb", clientDb);
  c.set("organizationId", organizationId);
  c.set("orgSlug", organizationSlug);

  logger.debug({ organizationId, slug: organizationSlug }, "Tenant middleware: client DB resolved");

  await next();
};
