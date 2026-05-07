import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { auditLogs } from "@apex-ia/database/schema/public";
import { logger } from "../utils/logger.js";

export interface LogActionParams {
  userId?: string | null | undefined;
  organizationId: string;
  action: string;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  oldValues?: object | undefined;
  newValues?: object | undefined;
  ipAddress?: string | undefined;
}

export class AuditTrailService {
  async logAction(params: LogActionParams): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        organizationId: params.organizationId,
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        oldValuesJson: params.oldValues || null,
        newValuesJson: params.newValues || null,
        ipAddress: params.ipAddress,
      });
      logger.info(
        { organizationId: params.organizationId, action: params.action },
        "Audit log recorded"
      );
    } catch (error) {
      logger.warn(
        { organizationId: params.organizationId, error },
        "Error logging audit trail"
      );
    }
  }

  async listAuditLogs(
    organizationId: string,
    filters?: { limit?: number | undefined; offset?: number | undefined } | undefined
  ): Promise<Array<typeof auditLogs.$inferSelect>> {
    try {
      const limit = Math.min(filters?.limit || 50, 200);
      const offset = filters?.offset || 0;

      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, organizationId))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { organizationId, error },
        "Error listing audit logs"
      );
      throw new Error(`AUDIT_LOG_LIST_FAILED: ${errorMessage}`);
    }
  }
}

export const auditTrailService = new AuditTrailService();
