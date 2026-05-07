import { supabaseAdmin } from "../db/supabase-admin.js";
import { db } from "../db/drizzle.js";
import { users, roles } from "@apex-ia/database/schema/public";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import type { PermissionsJson } from "@apex-ia/database/schema/public";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  roleId: string | null;
  roleName: string | null;
  displayName: string | null;
  permissionsJson: PermissionsJson | null;
  createdAt: Date;
};

export class TeamService {
  async listTeamMembers(organizationId: string): Promise<TeamMember[]> {
    try {
      const members = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          roleId: users.roleId,
          roleName: roles.name,
          displayName: roles.displayName,
          permissionsJson: roles.permissionsJson,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.organizationId, organizationId));

      return members.map(m => ({
        ...m,
        createdAt: m.createdAt ?? new Date(),
      })) as TeamMember[];
    } catch (error) {
      logger.error(
        { error, organizationId },
        "Failed to list team members"
      );
      throw new Error("TEAM_LIST_FAILED: No se pudieron obtener los miembros del equipo");
    }
  }

  async inviteTeamMember(
    organizationId: string,
    email: string,
    roleId: string
  ): Promise<void> {
    try {
      // Validate that roleId exists
      const roleExists = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (roleExists.length === 0) {
        throw new Error("INVALID_ROLE: El rol especificado no existe");
      }

      // Invite user via Supabase Auth
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            organizationId,
            roleId,
          },
        }
      );

      if (inviteError) {
        throw new Error(`SUPABASE_INVITE_FAILED: ${inviteError.message}`);
      }

      logger.info(
        { organizationId, email, roleId },
        "Team member invited successfully"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { error, organizationId, email, roleId },
        "Failed to invite team member"
      );
      throw new Error(`TEAM_INVITE_FAILED: ${errorMessage}`);
    }
  }

  async updateTeamMemberRole(
    organizationId: string,
    userId: string,
    newRoleId: string
  ): Promise<TeamMember> {
    try {
      // Validate that newRoleId exists
      const roleExists = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, newRoleId))
        .limit(1);

      if (roleExists.length === 0) {
        throw new Error("INVALID_ROLE: El rol especificado no existe");
      }

      // Update user role
      await db
        .update(users)
        .set({ roleId: newRoleId })
        .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));

      // Return updated member
      const member = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          roleId: users.roleId,
          roleName: roles.name,
          displayName: roles.displayName,
          permissionsJson: roles.permissionsJson,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (member.length === 0) {
        throw new Error("USER_NOT_FOUND: Usuario no encontrado");
      }

      logger.info(
        { organizationId, userId, newRoleId },
        "Team member role updated"
      );

      const result = member[0];
      if (!result) {
        throw new Error("USER_NOT_FOUND: Usuario no encontrado");
      }
      return {
        ...result,
        createdAt: result.createdAt ?? new Date(),
      } as TeamMember;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { error, organizationId, userId, newRoleId },
        "Failed to update team member role"
      );
      throw new Error(`TEAM_UPDATE_ROLE_FAILED: ${errorMessage}`);
    }
  }

  async updateTeamMemberPermissions(
    organizationId: string,
    userId: string,
    permissions: PermissionsJson
  ): Promise<void> {
    try {
      // Get user's role
      const userRecord = await db
        .select({ roleId: users.roleId })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
        .limit(1);

      if (userRecord.length === 0 || !userRecord[0]?.roleId) {
        throw new Error("USER_NOT_FOUND: Usuario no encontrado");
      }

      const roleId = userRecord[0]?.roleId ?? "";

      // Check if role is system role (cannot be modified)
      const roleRecord = await db
        .select({ isSystem: roles.isSystem })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (roleRecord.length > 0 && roleRecord[0]?.isSystem) {
        throw new Error("CANNOT_MODIFY_SYSTEM_ROLE: No se pueden modificar permisos de roles del sistema");
      }

      // Update role permissions
      await db
        .update(roles)
        .set({ permissionsJson: permissions })
        .where(eq(roles.id, roleId));

      logger.info(
        { organizationId, userId, roleId },
        "Team member permissions updated"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { error, organizationId, userId },
        "Failed to update team member permissions"
      );
      throw new Error(`TEAM_UPDATE_PERMISSIONS_FAILED: ${errorMessage}`);
    }
  }

  async removeTeamMember(organizationId: string, userId: string): Promise<void> {
    try {
      // Verify user belongs to organization
      const userRecord = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
        .limit(1);

      if (userRecord.length === 0) {
        throw new Error("USER_NOT_FOUND: Usuario no encontrado");
      }

      // Delete from Supabase Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        throw new Error(`SUPABASE_DELETE_FAILED: ${deleteError.message}`);
      }

      // Delete from database
      await db.delete(users).where(eq(users.id, userId));

      logger.info(
        { organizationId, userId },
        "Team member removed successfully"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { error, organizationId, userId },
        "Failed to remove team member"
      );
      throw new Error(`TEAM_REMOVE_MEMBER_FAILED: ${errorMessage}`);
    }
  }
}
