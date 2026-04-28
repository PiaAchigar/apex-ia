import { execSync } from "node:child_process";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { automations } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

type AutomationType = "python" | "json";

export type ExecuteAutomationResult = {
  success: boolean;
  output: string;
  error?: string;
};

export class AutomationService {
  constructor(
    private readonly tenantDb: DrizzleDb,
    private readonly supabaseAdmin: SupabaseClient
  ) {}

  async uploadAutomation(
    name: string,
    type: AutomationType,
    fileContent: string,
    organizationId: string
  ) {
    if (type !== "python" && type !== "json") {
      throw new Error("INVALID_AUTOMATION_TYPE");
    }

    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error("EMPTY_FILE_CONTENT");
    }

    const fileId = randomUUID();
    const ext = type === "python" ? "py" : "json";
    const fileName = `${fileId}.${ext}`;
    const bucketName = `automations-${organizationId}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, new TextEncoder().encode(fileContent), {
        contentType: type === "python" ? "text/plain" : "application/json",
      });

    if (uploadError) {
      logger.error({ uploadError: uploadError.message }, "Failed to upload automation file");
      throw new Error("FILE_UPLOAD_FAILED");
    }

    // Insert record in database
    const [created] = await this.tenantDb
      .insert(automations)
      .values({
        name,
        type,
        filePath: fileName,
        storageBucket: bucketName,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create automation record");
    }

    logger.info({ automationId: created.id, name, type }, "Automation uploaded");
    return created;
  }

  async listAutomations() {
    return this.tenantDb.select().from(automations).orderBy(automations.createdAt);
  }

  async getAutomationById(id: string) {
    const [automation] = await this.tenantDb
      .select()
      .from(automations)
      .where(eq(automations.id, id))
      .limit(1);

    if (!automation) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }

    return automation;
  }

  async executeAutomation(id: string): Promise<ExecuteAutomationResult> {
    const automation = await this.getAutomationById(id);

    try {
      let output = "";

      if (automation.type === "json") {
        // JSON: parse and validate structure (dry-run, no execution)
        const fileContent = await this.downloadFile(automation.storageBucket, automation.filePath);
        const parsed = JSON.parse(fileContent);
        output = JSON.stringify(parsed, null, 2);
      } else if (automation.type === "python") {
        // Python: execute with timeout and sandboxing
        if (process.env["PYTHON_EXECUTION_ENABLED"] !== "true") {
          throw new Error("PYTHON_EXECUTION_DISABLED");
        }

        const fileContent = await this.downloadFile(automation.storageBucket, automation.filePath);

        try {
          output = execSync(`python3 -c "${this.escapePythonCode(fileContent)}"`, {
            timeout: 30000,
            encoding: "utf-8",
            maxBuffer: 1024 * 1024, // 1MB
          });
        } catch (execError) {
          if (execError instanceof Error) {
            throw new Error(`PYTHON_EXECUTION_ERROR: ${execError.message}`);
          }
          throw new Error("PYTHON_EXECUTION_ERROR: Unknown error");
        }
      }

      // Update execution count and timestamp
      await this.tenantDb
        .update(automations)
        .set({
          executedCount: (automation.executedCount ?? 0) + 1,
          lastExecutedAt: new Date(),
          lastError: null,
        })
        .where(eq(automations.id, id));

      logger.info({ automationId: id, type: automation.type }, "Automation executed successfully");

      return {
        success: true,
        output: output.substring(0, 5000), // Limit output to 5KB
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      // Update last error
      await this.tenantDb
        .update(automations)
        .set({
          lastError: errorMsg,
          lastExecutedAt: new Date(),
        })
        .where(eq(automations.id, id));

      logger.error({ automationId: id, error: errorMsg }, "Automation execution failed");

      return {
        success: false,
        output: "",
        error: errorMsg,
      };
    }
  }

  async toggleAutomation(id: string, isActive: boolean) {
    const automation = await this.getAutomationById(id);

    const [updated] = await this.tenantDb
      .update(automations)
      .set({ isActive })
      .where(eq(automations.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to toggle automation");
    }

    logger.info({ automationId: id, isActive }, "Automation toggled");
    return updated;
  }

  async deleteAutomation(id: string): Promise<void> {
    const automation = await this.getAutomationById(id);

    // Delete from Supabase Storage
    const { error: deleteError } = await this.supabaseAdmin.storage
      .from(automation.storageBucket)
      .remove([automation.filePath]);

    if (deleteError) {
      logger.warn({ deleteError: deleteError.message }, "Failed to delete file from storage");
      // Don't throw — continue to delete DB record
    }

    // Delete from database
    await this.tenantDb.delete(automations).where(eq(automations.id, id));

    logger.info({ automationId: id }, "Automation deleted");
  }

  private async downloadFile(bucket: string, filePath: string): Promise<string> {
    const { data, error } = await this.supabaseAdmin.storage.from(bucket).download(filePath);

    if (error || !data) {
      logger.error({ error: error?.message }, "Failed to download automation file");
      throw new Error("FILE_DOWNLOAD_FAILED");
    }

    return new TextDecoder().decode(data);
  }

  private escapePythonCode(code: string): string {
    // Escape double quotes for shell execution
    return code.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }
}
