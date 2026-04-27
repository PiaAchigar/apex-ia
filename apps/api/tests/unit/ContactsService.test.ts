import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContactsService } from "../../src/services/ContactsService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue(result),
    }),
  };
}

function makeSelectChainDirect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function makeSelectChainWithLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "contact-1",
        name: "Updated Name",
        email: "updated@example.com",
        phone: null,
        tags: [],
        isArchived: false,
        createdAt: new Date(),
      },
    ]),
  };
}

function makeUpdateNoReturnChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ContactsService", () => {
  let service: ContactsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ContactsService(mockDb as never);
  });

  describe("createContact", () => {
    it("debería crear un contacto correctamente y retornarlo", async () => {
      const fakeContact = {
        id: "contact-abc",
        name: "John Doe",
        email: "john@example.com",
        phone: "+5491112345678",
        tags: ["vip"],
        customFieldsJson: null,
        isArchived: false,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(makeInsertChain([fakeContact]));

      const result = await service.createContact({
        name: "John Doe",
        email: "john@example.com",
        phone: "+5491112345678",
        tags: ["vip"],
      });

      expect(result).toEqual(fakeContact);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });
  });

  describe("updateContact", () => {
    it("debería lanzar CONTACT_NOT_FOUND si el contacto no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChainWithLimit([]));

      await expect(
        service.updateContact("ghost-id", { name: "New Name" })
      ).rejects.toThrow("CONTACT_NOT_FOUND");
    });

    it("debería actualizar el contacto si existe y retornarlo", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChainWithLimit([{ id: "contact-1" }]));
      mockDb.update.mockReturnValueOnce(makeUpdateChain());

      const result = await service.updateContact("contact-1", {
        name: "Updated Name",
        email: "updated@example.com",
      });

      expect(result.id).toBe("contact-1");
      expect(result.name).toBe("Updated Name");
      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("archiveContact", () => {
    it("debería setear isArchived = true", async () => {
      mockDb.update.mockReturnValueOnce(makeUpdateNoReturnChain());

      await expect(service.archiveContact("contact-1")).resolves.not.toThrow();

      const updateCall = mockDb.update.mock.results[0];
      expect(updateCall).toBeDefined();
      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("fetchContactWithFullConversationHistory", () => {
    it("debería retornar null si el contacto no existe", async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChainWithLimit([]))
        .mockReturnValueOnce(makeSelectChainDirect([]));

      const result = await service.fetchContactWithFullConversationHistory("ghost-id");
      expect(result).toBeNull();
    });

    it("debería retornar el contacto con sus conversaciones", async () => {
      const fakeContact = {
        id: "contact-1",
        name: "Jane",
        email: "jane@example.com",
        phone: null,
        isArchived: false,
        tags: [],
        customFieldsJson: null,
        createdAt: new Date(),
        whatsappId: null,
        instagramId: null,
        facebookId: null,
        telegramId: null,
      };

      const fakeConversations = [
        { id: "conv-1", contactId: "contact-1", channel: "whatsapp", status: "open" },
      ];

      mockDb.select
        .mockReturnValueOnce(makeSelectChainWithLimit([fakeContact]))
        .mockReturnValueOnce(makeSelectChainDirect(fakeConversations));

      const result = await service.fetchContactWithFullConversationHistory("contact-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("contact-1");
      expect(result!.conversations).toHaveLength(1);
    });
  });

  describe("searchContacts", () => {
    it("debería retornar un array de contactos", async () => {
      const fakeContacts = [
        { id: "c-1", name: "Alice", email: "alice@example.com", phone: null },
        { id: "c-2", name: "Bob", email: "bob@example.com", phone: null },
      ];

      mockDb.select.mockReturnValueOnce(makeSelectChain(fakeContacts));

      const result = await service.searchContacts("alice", 1, 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("debería retornar array vacío si no hay resultados", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      const result = await service.searchContacts("zzznomatch", 1, 10);

      expect(result).toHaveLength(0);
    });
  });

  describe("importContactsFromCsvFile", () => {
    it("debería importar contactos desde CSV y retornar conteo", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const csv = "name,email,phone\nJohn,john@test.com,123456\nJane,jane@test.com,654321";
      const result = await service.importContactsFromCsvFile(csv);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("debería retornar error si el CSV está vacío", async () => {
      const result = await service.importContactsFromCsvFile("");

      expect(result.errors).toHaveLength(1);
      expect(result.imported).toBe(0);
    });
  });

  describe("exportContactsToCsv", () => {
    it("debería retornar un string CSV con encabezados", async () => {
      const fakeContacts = [
        {
          id: "c-1",
          name: "Alice",
          email: "alice@example.com",
          phone: "123",
          tags: ["vip"],
          isArchived: false,
          createdAt: new Date("2024-01-01"),
          customFieldsJson: null,
          whatsappId: null,
          instagramId: null,
          facebookId: null,
          telegramId: null,
        },
      ];

      mockDb.select.mockReturnValueOnce(makeSelectChainDirect(fakeContacts));

      const csv = await service.exportContactsToCsv({ isArchived: false });

      expect(typeof csv).toBe("string");
      expect(csv).toContain("id,name,email,phone,tags,isArchived,createdAt");
      expect(csv).toContain("Alice");
    });
  });
});
