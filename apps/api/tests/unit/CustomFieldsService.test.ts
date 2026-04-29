import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { CustomFieldsService } from "../../src/services/CustomFieldsService.js";
import { customFieldDefinitions } from "@apex-ia/database/schema/tenant";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChainWithReturning(result: unknown[]) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain(rowCount = 1) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue({ rowCount }),
  };
}

describe("CustomFieldsService", () => {
  let service: CustomFieldsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomFieldsService(mockDb as never);
  });

  describe("listFieldDefinitions", () => {
    it("should list all active field definitions for contact entity type", async () => {
      const mockFields = [
        {
          id: "field-1",
          entityType: "contact",
          fieldKey: "company",
          label: "Company",
          fieldType: "text",
          options: [],
          isRequired: true,
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(makeSelectChain(mockFields));

      const result = await service.listFieldDefinitions("contact");

      expect(result).toEqual(mockFields);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should list all active field definitions for deal entity type", async () => {
      const mockFields = [
        {
          id: "field-2",
          entityType: "deal",
          fieldKey: "value",
          label: "Deal Value",
          fieldType: "number",
          options: [],
          isRequired: false,
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(makeSelectChain(mockFields));

      const result = await service.listFieldDefinitions("deal");

      expect(result).toEqual(mockFields);
    });
  });

  describe("createFieldDefinition", () => {
    it("should create a new custom field definition", async () => {
      const input = {
        entityType: "contact" as const,
        fieldKey: "birthDate",
        label: "Birth Date",
        fieldType: "date" as const,
        isRequired: false,
        displayOrder: 2,
      };

      const mockCreated = {
        id: "new-field-1",
        ...input,
        options: [],
        isActive: true,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(makeInsertChain([mockCreated]));

      const result = await service.createFieldDefinition(input);

      expect(result).toEqual(mockCreated);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error if insert returns no rows", async () => {
      const input = {
        entityType: "contact" as const,
        fieldKey: "test",
        label: "Test",
        fieldType: "text" as const,
      };

      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(service.createFieldDefinition(input)).rejects.toThrow(
        "Failed to create custom field"
      );
    });
  });

  describe("updateFieldDefinition", () => {
    it("should update a custom field definition", async () => {
      const fieldId = "field-1";
      const input = {
        label: "Updated Label",
        isRequired: true,
      };

      const mockUpdated = {
        id: fieldId,
        entityType: "contact",
        fieldKey: "company",
        label: "Updated Label",
        fieldType: "text",
        options: [],
        isRequired: true,
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
      };

      mockDb.update.mockReturnValueOnce(makeUpdateChainWithReturning([mockUpdated]));

      const result = await service.updateFieldDefinition(fieldId, input);

      expect(result).toEqual(mockUpdated);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should throw error if field not found", async () => {
      const fieldId = "nonexistent-field";
      const input = { label: "Test" };

      mockDb.update.mockReturnValueOnce(makeUpdateChainWithReturning([]));

      await expect(service.updateFieldDefinition(fieldId, input)).rejects.toThrow(
        "Custom field not found"
      );
    });
  });

  describe("deleteFieldDefinition", () => {
    it("should soft-delete a custom field definition", async () => {
      const fieldId = "field-1";

      const mockChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };

      mockDb.update.mockReturnValueOnce(mockChain);

      await service.deleteFieldDefinition(fieldId);

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should throw error if field not found", async () => {
      const fieldId = "nonexistent-field";

      const mockChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      };

      mockDb.update.mockReturnValueOnce(mockChain);

      await expect(service.deleteFieldDefinition(fieldId)).rejects.toThrow(
        "Custom field not found"
      );
    });
  });
});
