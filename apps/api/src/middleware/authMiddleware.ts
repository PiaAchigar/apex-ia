import type { MiddlewareHandler } from "hono";
import { createClient } from "@supabase/supabase-js";
import { db } from "../db/drizzle.js";
import { users, organizations, roles } from "@apex-ia/database/schema/public";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import type { PermissionsJson } from "@apex-ia/database/schema/public";
import { ApiKeyService } from "../services/ApiKeyService.js";

type AuthContext = {
  userId: string | null;
  organizationId: string;
  organizationSlug: string;
  roleId?: string;
  roleName: string;
  permissions: PermissionsJson | {};
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Check X-Api-Key header first
  const apiKeyHeader = c.req.header("X-Api-Key");
  if (apiKeyHeader) {
    try {
      const apiKeyService = new ApiKeyService();
      const result = await apiKeyService.validateApiKey(apiKeyHeader);

      if (!result) {
        return c.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "API key inválida" } },
          401
        );
      }

      // Get organization slug for API key auth
      const [orgData] = await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, result.organizationId))
        .limit(1);

      if (!orgData?.slug) {
        return c.json(
          { success: false, error: { code: "ORGANIZATION_NOT_FOUND", message: "Organización no encontrada" } },
          404
        );
      }

      c.set("auth", {
        userId: null,
        organizationId: result.organizationId,
        organizationSlug: orgData.slug,
        roleName: "api_key",
        permissions: {},
      });

      await next();
      return;
    } catch (error) {
      logger.error({ error }, "API key validation failed");
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Error validando API key" } },
        401
      );
    }
  }

  // Fallback to Bearer token
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Token requerido" } },
      401
    );
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    logger.warn({ error: error?.message }, "Auth token verification failed");
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Token inválido o expirado" } },
      401
    );
  }

  const [result] = await db
    .select({
      organizationId: users.organizationId,
      orgSlug: organizations.slug,
      roleId: roles.id,
      roleName: roles.name,
      permissions: roles.permissionsJson,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.id, user.id))
    .limit(1);

  if (!result?.organizationId) {
    return c.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "Usuario no encontrado" } },
      404
    );
  }

  c.set("auth", {
    userId: user.id,
    organizationId: result.organizationId,
    organizationSlug: result.orgSlug,
    roleId: result.roleId,
    roleName: result.roleName,
    permissions: result.permissions as PermissionsJson,
  });

  await next();
};
