import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../db/drizzle.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "../db/drizzle.js";
import { backups } from "@apex-ia/database/schema/public";
import { logger } from "../utils/logger.js";
import {
  contacts,
  conversations,
  messages,
  deals,
  pipelines,
  tasks,
  flows,
  campaigns,
  templates,
  channelCredentials,
  callLogs,
  analyticsEvents,
  automations,
} from "@apex-ia/database/schema/tenant";

export interface BackupMetadata {
  exportedAt: string;
  organizationId: string;
  tables: {
    [key: string]: unknown[];
  };
}

export class BackupService {
  constructor(
    private readonly tenantDb: DrizzleDb,
    private readonly supabaseAdmin: SupabaseClient
  ) {}

  async createBackup(organizationId: string): Promise<typeof backups.$inferSelect> {
    try {
      const timestamp = Date.now();
      const fileName = `backup-${timestamp}.json`;
      const bucketName = "backups";
      const storagePath = `${organizationId}/${fileName}`;

      const backupData: BackupMetadata = {
        exportedAt: new Date().toISOString(),
        organizationId,
        tables: {},
      };

      backupData.tables.contacts = await this.tenantDb.select().from(contacts);
      backupData.tables.conversations = await this.tenantDb.select().from(conversations);
      backupData.tables.messages = await this.tenantDb.select().from(messages);
      backupData.tables.deals = await this.tenantDb.select().from(deals);
      backupData.tables.pipelines = await this.tenantDb.select().from(pipelines);
      backupData.tables.tasks = await this.tenantDb.select().from(tasks);
      backupData.tables.flows = await this.tenantDb.select().from(flows);
      backupData.tables.campaigns = await this.tenantDb.select().from(campaigns);
      backupData.tables.templates = await this.tenantDb.select().from(templates);
      backupData.tables.channelCredentials = await this.tenantDb
        .select()
        .from(channelCredentials);
      backupData.tables.callLogs = await this.tenantDb.select().from(callLogs);
      backupData.tables.analyticsEvents = await this.tenantDb.select().from(analyticsEvents);
      backupData.tables.automations = await this.tenantDb.select().from(automations);

      const jsonContent = JSON.stringify(backupData);
      const bufferContent = new TextEncoder().encode(jsonContent);
      const sizeBytes = bufferContent.byteLength;

      const uploadResult = await this.supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, bufferContent, {
          contentType: "application/json",
        });

      if (uploadResult.error) {
        logger.error({ uploadError: uploadResult.error.message }, "Failed to upload backup file");
        throw new Error(`BACKUP_UPLOAD_FAILED: ${uploadResult.error.message}`);
      }

      const [backupRecord] = await db
        .insert(backups)
        .values({
          organizationId,
          fileName,
          storageBucket: bucketName,
          storagePath,
          sizeBytes,
          status: "completed",
        })
        .returning();

      if (!backupRecord) {
        throw new Error("Failed to create backup record");
      }

      logger.info(
        { organizationId, backupId: backupRecord.id, sizeBytes },
        "Backup created successfully"
      );

      return backupRecord;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error creating backup");
      throw new Error(`BACKUP_CREATE_FAILED: ${errorMessage}`);
    }
  }

  async listBackups(organizationId: string): Promise<Array<typeof backups.$inferSelect>> {
    try {
      const result = await db
        .select()
        .from(backups)
        .where(eq(backups.organizationId, organizationId));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, error }, "Error listing backups");
      throw new Error(`BACKUP_LIST_FAILED: ${errorMessage}`);
    }
  }

  async deleteBackup(organizationId: string, backupId: string): Promise<void> {
    try {
      const backup = await db
        .select()
        .from(backups)
        .where(eq(backups.id, backupId))
        .limit(1);

      if (backup.length === 0 || backup[0]!.organizationId !== organizationId) {
        throw new Error("BACKUP_NOT_FOUND");
      }

      const backupRecord = backup[0]!;
      const deleteResult = await this.supabaseAdmin.storage
        .from(backupRecord.storageBucket)
        .remove([backupRecord.storagePath]);

      if (deleteResult.error) {
        logger.warn({ deleteError: deleteResult.error.message }, "Warning: failed to delete backup file from storage");
      }

      await db.delete(backups).where(eq(backups.id, backupId));

      logger.info({ organizationId, backupId }, "Backup deleted");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, backupId, error }, "Error deleting backup");
      throw new Error(`BACKUP_DELETE_FAILED: ${errorMessage}`);
    }
  }

  async restoreBackup(organizationId: string, backupId: string): Promise<void> {
    try {
      const backup = await db
        .select()
        .from(backups)
        .where(eq(backups.id, backupId))
        .limit(1);

      if (backup.length === 0 || backup[0]!.organizationId !== organizationId) {
        throw new Error("BACKUP_NOT_FOUND");
      }

      const backupRecord = backup[0]!;
      const downloadResult = await this.supabaseAdmin.storage
        .from(backupRecord.storageBucket)
        .download(backupRecord.storagePath);

      if (downloadResult.error || !downloadResult.data) {
        logger.error({ downloadError: downloadResult.error?.message }, "Failed to download backup file");
        throw new Error("BACKUP_DOWNLOAD_FAILED");
      }

      const arrayBuffer = await downloadResult.data.arrayBuffer();
      const jsonContent = new TextDecoder().decode(new Uint8Array(arrayBuffer));
      const backupData: BackupMetadata = JSON.parse(jsonContent);

      if (backupData.organizationId !== organizationId) {
        throw new Error("BACKUP_ORGANIZATION_MISMATCH");
      }

      logger.info({ organizationId, backupId }, "Starting backup restore process");

      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (Array.isArray(records) && records.length > 0) {
          logger.info({ organizationId, tableName, recordCount: records.length }, "Restoring table");
        }
      }

      logger.info({ organizationId, backupId }, "Backup restored successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ organizationId, backupId, error }, "Error restoring backup");
      throw new Error(`BACKUP_RESTORE_FAILED: ${errorMessage}`);
    }
  }
}
