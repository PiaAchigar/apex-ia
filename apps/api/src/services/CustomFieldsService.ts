import { eq, and, desc } from "drizzle-orm";
import { customFieldDefinitions } from "@apex-ia/database/schema/tenant";
import type { CustomFieldDefinition, NewCustomFieldDefinition } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";

export interface CreateCustomFieldInput {
  entityType: "contact" | "deal";
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options?: string[] | undefined;
  isRequired?: boolean | undefined;
  displayOrder?: number | undefined;
}

export interface UpdateCustomFieldInput {
  label?: string | undefined;
  fieldType?: "text" | "number" | "date" | "boolean" | "select" | undefined;
  options?: string[] | undefined;
  isRequired?: boolean | undefined;
  displayOrder?: number | undefined;
  isActive?: boolean | undefined;
}

export class CustomFieldsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async listFieldDefinitions(
    entityType: "contact" | "deal"
  ): Promise<CustomFieldDefinition[]> {
    return this.tenantDb
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.entityType, entityType),
          eq(customFieldDefinitions.isActive, true)
        )
      )
      .orderBy(desc(customFieldDefinitions.displayOrder));
  }

  async createFieldDefinition(
    input: CreateCustomFieldInput
  ): Promise<CustomFieldDefinition> {
    const record: NewCustomFieldDefinition = {
      entityType: input.entityType,
      fieldKey: input.fieldKey,
      label: input.label,
      fieldType: input.fieldType,
      options: input.options || [],
      isRequired: input.isRequired || false,
      displayOrder: input.displayOrder || 0,
      isActive: true,
    };

    const result = await this.tenantDb
      .insert(customFieldDefinitions)
      .values(record)
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create custom field");
    }

    return result[0];
  }

  async updateFieldDefinition(
    fieldId: string,
    input: UpdateCustomFieldInput
  ): Promise<CustomFieldDefinition> {
    const result = await this.tenantDb
      .update(customFieldDefinitions)
      .set({
        label: input.label,
        fieldType: input.fieldType,
        options: input.options,
        isRequired: input.isRequired,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
      })
      .where(eq(customFieldDefinitions.id, fieldId))
      .returning();

    if (!result[0]) {
      throw new Error("Custom field not found");
    }

    return result[0];
  }

  async deleteFieldDefinition(fieldId: string): Promise<void> {
    const result = await this.tenantDb
      .update(customFieldDefinitions)
      .set({ isActive: false })
      .where(eq(customFieldDefinitions.id, fieldId))
      .returning();

    if (!result.length) {
      throw new Error("Custom field not found");
    }
  }
}
