import { eq, ilike, or, and } from "drizzle-orm";
import { contacts, conversations } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import type { UpdateContactInput } from "@apex-ia/types";
import { logger } from "../utils/logger.js";

type CreateContactInput = {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tags?: string[] | undefined;
  customFieldsJson?: Record<string, unknown> | undefined;
};

type CsvExportFilters = {
  isArchived?: boolean | undefined;
  tags?: string[] | undefined;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export class ContactsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async createContact(input: CreateContactInput) {
    const [created] = await this.tenantDb
      .insert(contacts)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        tags: input.tags,
        customFieldsJson: input.customFieldsJson,
      })
      .returning();

    if (!created) throw new Error("Failed to create contact");

    logger.info({ contactId: created.id }, "Contact created");
    return created;
  }

  async updateContact(id: string, input: UpdateContactInput) {
    const existing = await this.tenantDb
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new Error("CONTACT_NOT_FOUND");
    }

    const [updated] = await this.tenantDb
      .update(contacts)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.customFieldsJson !== undefined && {
          customFieldsJson: input.customFieldsJson,
        }),
      })
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) throw new Error("Failed to update contact");

    logger.info({ contactId: id }, "Contact updated");
    return updated;
  }

  async archiveContact(id: string) {
    await this.tenantDb
      .update(contacts)
      .set({ isArchived: true })
      .where(eq(contacts.id, id));

    logger.info({ contactId: id }, "Contact archived");
  }

  async fetchContactWithFullConversationHistory(contactId: string) {
    const contact = await this.tenantDb
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact[0]) return null;

    const contactConversations = await this.tenantDb
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, contactId));

    return {
      ...contact[0],
      conversations: contactConversations,
    };
  }

  async importContactsFromCsvFile(csvContent: string): Promise<ImportResult> {
    const lines = csvContent.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      return { imported: 0, skipped: 0, errors: ["CSV file is empty"] };
    }

    const [headerLine, ...dataLines] = lines;
    const headers = (headerLine ?? "").split(",").map((h) => h.trim().toLowerCase());

    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const phoneIdx = headers.indexOf("phone");

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line) {
        result.skipped++;
        continue;
      }

      const cols = line.split(",").map((c) => c.trim());

      const name = nameIdx >= 0 ? (cols[nameIdx] ?? "") : "";
      const email = emailIdx >= 0 ? (cols[emailIdx] ?? "") : "";
      const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "";

      if (!name && !email && !phone) {
        result.skipped++;
        continue;
      }

      try {
        await this.tenantDb.insert(contacts).values({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
        });
        result.imported++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Row ${i + 2}: ${message}`);
        result.skipped++;
      }
    }

    logger.info(
      { imported: result.imported, skipped: result.skipped },
      "CSV import completed"
    );

    return result;
  }

  async exportContactsToCsv(filters: CsvExportFilters): Promise<string> {
    const conditions = [];

    if (filters.isArchived !== undefined) {
      conditions.push(eq(contacts.isArchived, filters.isArchived));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.tenantDb
      .select()
      .from(contacts)
      .where(whereClause);

    const filteredRows =
      filters.tags && filters.tags.length > 0
        ? rows.filter((row) => {
            if (!row.tags) return false;
            return filters.tags!.some((tag) => row.tags!.includes(tag));
          })
        : rows;

    const csvLines: string[] = ["id,name,email,phone,tags,isArchived,createdAt"];

    for (const row of filteredRows) {
      const tags = row.tags ? row.tags.join("|") : "";
      const line = [
        row.id,
        row.name ?? "",
        row.email ?? "",
        row.phone ?? "",
        tags,
        String(row.isArchived ?? false),
        row.createdAt ? row.createdAt.toISOString() : "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");

      csvLines.push(line);
    }

    return csvLines.join("\n");
  }

  async searchContacts(query: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb
      .select()
      .from(contacts)
      .where(
        or(
          ilike(contacts.name, `%${query}%`),
          ilike(contacts.email, `%${query}%`),
          ilike(contacts.phone, `%${query}%`)
        )
      )
      .limit(limit)
      .offset(offset);

    return rows;
  }
}
