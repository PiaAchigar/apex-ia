import { Hono } from "hono";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";
import { supabaseAdmin } from "../../db/supabase-admin.js";
import { BackupService } from "../../services/BackupService.js";
import { logger } from "../../utils/logger.js";

export function createBackupRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET / — List backups
  router.get("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = c.get("tenantDb");

    try {
      const service = new BackupService(tenantDb, supabaseAdmin);
      const backupList = await service.listBackups(organizationId);
      return c.json({ success: true, data: backupList });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error listing backups");
      return c.json(
        {
          success: false,
          error: { code: "BACKUP_LIST_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // POST / — Create new backup
  router.post("/", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = c.get("tenantDb");

    try {
      const service = new BackupService(tenantDb, supabaseAdmin);
      const backup = await service.createBackup(organizationId);
      return c.json({ success: true, data: backup }, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error creating backup");
      return c.json(
        {
          success: false,
          error: { code: "BACKUP_CREATE_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // POST /:id/restore — Restore a backup
  router.post("/:id/restore", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = c.get("tenantDb");
    const backupId = c.req.param("id");

    try {
      const service = new BackupService(tenantDb, supabaseAdmin);
      await service.restoreBackup(organizationId, backupId);
      return c.json({ success: true, data: { message: "Backup restored successfully" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, backupId }, "Error restoring backup");
      return c.json(
        {
          success: false,
          error: { code: "BACKUP_RESTORE_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  // DELETE /:id — Delete a backup
  router.delete("/:id", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const tenantDb = c.get("tenantDb");
    const backupId = c.req.param("id");

    try {
      const service = new BackupService(tenantDb, supabaseAdmin);
      await service.deleteBackup(organizationId, backupId);
      return c.json({ success: true, data: { message: "Backup deleted successfully" } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId, backupId }, "Error deleting backup");
      return c.json(
        {
          success: false,
          error: { code: "BACKUP_DELETE_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  return router;
}
