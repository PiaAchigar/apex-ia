import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { TeamService } from "../../services/TeamService.js";
import { logger } from "../../utils/logger.js";
import type { PermissionsJson } from "@apex-ia/database/schema/public";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  roleId: z.string().uuid("roleId debe ser un UUID válido"),
});

const updateRoleSchema = z.object({
  roleId: z.string().uuid("roleId debe ser un UUID válido"),
});

const updatePermissionsSchema = z.object({
  permissions: z.object({
    inbox: z.object({ read: z.boolean(), write: z.boolean() }),
    contacts: z.object({ read: z.boolean(), write: z.boolean() }),
    pipeline: z.object({ read: z.boolean(), write: z.boolean() }),
    tasks: z.object({ read: z.boolean(), write: z.boolean() }),
    calendar: z.object({ read: z.boolean(), write: z.boolean() }),
    campaigns: z.object({ read: z.boolean(), write: z.boolean() }),
    flowBuilder: z.object({ read: z.boolean(), write: z.boolean() }),
    templates: z.object({ read: z.boolean(), write: z.boolean() }),
    analytics: z.object({ read: z.boolean() }),
    reports: z.object({ read: z.boolean() }),
    callLogs: z.object({ read: z.boolean() }),
    settings: z.object({ read: z.boolean(), write: z.boolean() }),
    team: z.object({ read: z.boolean(), write: z.boolean() }),
    billing: z.object({ read: z.boolean(), write: z.boolean() }),
    apiAccess: z.object({ read: z.boolean(), write: z.boolean() }),
    aiCredentials: z.object({ read: z.boolean(), write: z.boolean() }),
  }) as z.ZodType<PermissionsJson>,
});

type InviteInput = z.infer<typeof inviteSchema>;
type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

export function createTeamRoutes() {
  const router = new Hono();
  const teamService = new TeamService();

  router.use("*", authMiddleware);

  // GET / — List team members
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;

    try {
      const members = await teamService.listTeamMembers(organizationId);
      return c.json({ success: true, data: members });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error listing team members");
      return c.json(
        {
          success: false,
          error: { code: "TEAM_LIST_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // POST /invite — Invite team member
  router.post("/invite", zValidator("json", inviteSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as InviteInput;

    try {
      await teamService.inviteTeamMember(organizationId, body.email, body.roleId);
      return c.json(
        { success: true, data: { message: "Invitación enviada" } },
        201
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, email: body.email }, "Error inviting team member");
      return c.json(
        {
          success: false,
          error: { code: "TEAM_INVITE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // PATCH /:userId/role — Update member role
  router.patch("/:userId/role", zValidator("json", updateRoleSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const userId = c.req.param("userId");
    const body = c.req.valid("json") as UpdateRoleInput;

    try {
      const updated = await teamService.updateTeamMemberRole(
        organizationId,
        userId,
        body.roleId
      );
      return c.json({ success: true, data: updated });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, userId }, "Error updating team member role");
      return c.json(
        {
          success: false,
          error: { code: "TEAM_UPDATE_ROLE_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  // PATCH /:userId/permissions — Update member permissions
  router.patch(
    "/:userId/permissions",
    zValidator("json", updatePermissionsSchema),
    async (c) => {
      const auth = c.get("auth");
      const { organizationId } = auth;
      const userId = c.req.param("userId");
      const body = c.req.valid("json") as UpdatePermissionsInput;

      try {
        await teamService.updateTeamMemberPermissions(
          organizationId,
          userId,
          body.permissions
        );
        return c.json({ success: true, data: { message: "Permisos actualizados" } });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          { error, organizationId, userId },
          "Error updating team member permissions"
        );
        return c.json(
          {
            success: false,
            error: { code: "TEAM_UPDATE_PERMISSIONS_FAILED", message: errorMessage },
          },
          400
        );
      }
    }
  );

  // DELETE /:userId — Remove team member
  router.delete("/:userId", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const userId = c.req.param("userId");

    try {
      await teamService.removeTeamMember(organizationId, userId);
      return c.json({ success: true, data: { message: "Miembro removido" } }, 200 as never);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, userId }, "Error removing team member");
      return c.json(
        {
          success: false,
          error: { code: "TEAM_REMOVE_MEMBER_FAILED", message: errorMessage },
        },
        400
      );
    }
  });

  return router;
}
