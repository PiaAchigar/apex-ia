import { supabaseAdmin } from "../db/supabase-admin.js";
import { db } from "../db/drizzle.js";
import { organizations, users, roles } from "@apex-ia/database/schema/public";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import { auditTrailService } from "./AuditTrailService.js";
import type { RegisterInput, LoginInput } from "../utils/validators.js";
import type { PermissionsJson } from "@apex-ia/database/schema/public";

export class AuthService {
  async registerUserAndOrganization(input: RegisterInput, ipAddress?: string) {
    const { email, password, fullName, organizationName, organizationSlug } = input;

    const existingOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, organizationSlug))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new Error("SLUG_TAKEN: El slug de organización ya está en uso");
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError || !authData.user) {
      throw new Error(`AUTH_CREATE_FAILED: ${authError?.message}`);
    }

    const userId = authData.user.id;

    try {
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const [org] = await db
        .insert(organizations)
        .values({
          slug: organizationSlug,
          name: organizationName,
          plan: "starter",
          trialEndsAt,
        })
        .returning();

      if (!org) throw new Error("Failed to create organization");

      const [adminRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, "admin"))
        .limit(1);

      if (!adminRole) {
        throw new Error("SETUP_ERROR: Rol admin no encontrado — ejecutá la migración 0003");
      }

      await db.insert(users).values({
        id: userId,
        organizationId: org.id,
        email,
        fullName,
        roleId: adminRole.id,
      });

      await auditTrailService.logAction({
        userId,
        organizationId: org.id,
        action: "org.created",
        resourceType: "organization",
        resourceId: org.id,
        newValues: { slug: organizationSlug, plan: "starter" },
        ipAddress,
      });

      logger.info(
        { userId, orgSlug: organizationSlug },
        "New organization registered"
      );

      return { userId, organizationId: org.id, organizationSlug };
    } catch (err) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw err;
    }
  }

  async loginWithEmailAndPassword(input: LoginInput) {
    const { email, password } = input;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new Error("INVALID_CREDENTIALS: Email o contraseña incorrectos");
    }

    const [userWithRole] = await db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        roleId: roles.id,
        roleName: roles.name,
        permissions: roles.permissionsJson,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, data.user.id))
      .limit(1);

    if (!userWithRole?.organizationId) {
      throw new Error("USER_NOT_FOUND: Usuario sin organización asignada");
    }

    const [org] = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, userWithRole.organizationId))
      .limit(1);

    if (!org) {
      throw new Error("ORG_NOT_FOUND: Organización no encontrada");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      userId: data.user.id,
      organizationId: userWithRole.organizationId,
      organizationSlug: org.slug,
      roleId: userWithRole.roleId,
      roleName: userWithRole.roleName,
      permissions: userWithRole.permissions as PermissionsJson,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new Error("INVALID_REFRESH_TOKEN: Refresh token inválido o expirado");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    };
  }

  async logoutUser(accessToken: string) {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
    if (error) {
      logger.warn({ error: error.message }, "Logout error (non-critical)");
    }
  }

}
