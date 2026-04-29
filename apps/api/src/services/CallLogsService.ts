import { DrizzleDb } from "../db/drizzle.js";
import { callLogs, CallLog, NewCallLog } from "@apex-ia/database/schema/tenant";
import { eq, desc } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export class CallLogsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async listCallLogs(page: number = 1, limit: number = 50): Promise<{ data: CallLog[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const data = await this.tenantDb
        .select()
        .from(callLogs)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await this.tenantDb
        .select({ count: callLogs.id })
        .from(callLogs);

      const total = countResult.length;

      return { data, total };
    } catch (error) {
      logger.error("Error listing call logs", { error });
      throw error;
    }
  }

  async createCallLog(input: NewCallLog): Promise<CallLog> {
    try {
      const result = await this.tenantDb
        .insert(callLogs)
        .values(input)
        .returning();

      return result[0];
    } catch (error) {
      logger.error("Error creating call log", { error });
      throw error;
    }
  }

  async getCallLogById(id: string): Promise<CallLog | null> {
    try {
      const result = await this.tenantDb
        .select()
        .from(callLogs)
        .where(eq(callLogs.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error("Error getting call log", { error, id });
      throw error;
    }
  }
}
