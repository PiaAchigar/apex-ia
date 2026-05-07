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
      logger.error({ error }, "Error listing call logs");
      throw error;
    }
  }

  async createCallLog(input: NewCallLog): Promise<CallLog> {
    try {
      const [result] = await this.tenantDb
        .insert(callLogs)
        .values(input)
        .returning();

      if (!result) {
        throw new Error("CALL_LOG_NOT_CREATED");
      }

      return result;
    } catch (error) {
      logger.error({ error }, "Error creating call log");
      throw error;
    }
  }

  async getCallLogById(id: string): Promise<CallLog | null> {
    try {
      const [result] = await this.tenantDb
        .select()
        .from(callLogs)
        .where(eq(callLogs.id, id))
        .limit(1);

      return result || null;
    } catch (error) {
      logger.error({ error, id }, "Error getting call log");
      throw error;
    }
  }
}
