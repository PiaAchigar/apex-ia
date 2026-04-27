import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ContactsService } from "../services/ContactsService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const createContactSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  tags: z.array(z.string()).optional(),
  customFieldsJson: z.record(z.unknown()).optional(),
});

const updateContactSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  tags: z.array(z.string()).optional(),
  customFieldsJson: z.record(z.unknown()).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().optional().default(""),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
});

const exportQuerySchema = z.object({
  isArchived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",") : undefined)),
});

const importCsvSchema = z.object({
  csvContent: z.string().min(1),
});

export function createContactsRoutes() {
  const contactsRoutes = new Hono();

  contactsRoutes.use("*", authMiddleware);
  contactsRoutes.use("*", tenantMiddleware);

  contactsRoutes.get(
    "/",
    zValidator("query", searchQuerySchema),
    async (c) => {
      const { q, page, limit } = c.req.valid("query");
      const tenantDb = c.get("tenantDb");

      const service = new ContactsService(tenantDb);
      const data = await service.searchContacts(q, page, limit);

      return c.json({ success: true, data });
    }
  );

  contactsRoutes.post(
    "/",
    zValidator("json", createContactSchema),
    async (c) => {
      const input = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const service = new ContactsService(tenantDb);
      const contact = await service.createContact(input);

      return c.json({ success: true, data: contact }, 201);
    }
  );

  // Static routes must be registered before dynamic /:contactId to avoid param capture
  contactsRoutes.post(
    "/import-csv",
    zValidator("json", importCsvSchema),
    async (c) => {
      const { csvContent } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const service = new ContactsService(tenantDb);
      const result = await service.importContactsFromCsvFile(csvContent);

      return c.json({ success: true, data: result });
    }
  );

  contactsRoutes.get(
    "/export-csv",
    zValidator("query", exportQuerySchema),
    async (c) => {
      const filters = c.req.valid("query");
      const tenantDb = c.get("tenantDb");

      const service = new ContactsService(tenantDb);
      const csv = await service.exportContactsToCsv({
        isArchived: filters.isArchived,
        tags: filters.tags,
      });

      c.header("Content-Type", "text/csv");
      c.header("Content-Disposition", 'attachment; filename="contacts.csv"');

      return c.body(csv);
    }
  );

  contactsRoutes.get("/:contactId", async (c) => {
    const { contactId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const service = new ContactsService(tenantDb);
    const result = await service.fetchContactWithFullConversationHistory(contactId);

    if (!result) {
      return c.json(
        { success: false, error: { code: "CONTACT_NOT_FOUND", message: "Contact not found" } },
        404
      );
    }

    return c.json({ success: true, data: result });
  });

  contactsRoutes.patch(
    "/:contactId",
    zValidator("json", updateContactSchema),
    async (c) => {
      const { contactId } = c.req.param();
      const input = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const service = new ContactsService(tenantDb);

      try {
        const updated = await service.updateContact(contactId, input);
        return c.json({ success: true, data: updated });
      } catch (err) {
        if (err instanceof Error && err.message === "CONTACT_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "CONTACT_NOT_FOUND", message: "Contact not found" } },
            404
          );
        }
        throw err;
      }
    }
  );

  contactsRoutes.delete("/:contactId/archive", async (c) => {
    const { contactId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const service = new ContactsService(tenantDb);
    await service.archiveContact(contactId);

    return c.json({ success: true, data: { contactId, isArchived: true } });
  });

  return contactsRoutes;
}
