import { eq, and, sql } from "drizzle-orm";
import { tasks } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

type TaskPriority = "low" | "medium" | "high";
type TaskStatus = "pending" | "in_progress" | "done";

type CreateTaskInput = {
  title: string;
  description?: string;
  assignedAgentId?: string;
  relatedContactId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
};

type UpdateTaskInput = Partial<{
  title: string;
  description: string;
  assignedAgentId: string;
  relatedContactId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
}>;

type GetTasksFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
};

export class TasksService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async createTask(input: CreateTaskInput) {
    const [created] = await this.tenantDb
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description,
        assignedAgentId: input.assignedAgentId,
        relatedContactId: input.relatedContactId,
        priority: input.priority ?? "medium",
        status: "pending",
        dueDate: input.dueDate,
      })
      .returning();

    if (!created) throw new Error("Failed to create task");

    logger.info({ taskId: created.id }, "Task created");
    return created;
  }

  async updateTask(id: string, input: UpdateTaskInput) {
    const existing = await this.tenantDb
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new Error("TASK_NOT_FOUND");
    }

    const [updated] = await this.tenantDb
      .update(tasks)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.assignedAgentId !== undefined && { assignedAgentId: input.assignedAgentId }),
        ...(input.relatedContactId !== undefined && { relatedContactId: input.relatedContactId }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      })
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) throw new Error("Failed to update task");

    logger.info({ taskId: id }, "Task updated");
    return updated;
  }

  async completeTask(id: string) {
    const existing = await this.tenantDb
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.tenantDb
      .update(tasks)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(tasks.id, id));

    logger.info({ taskId: id }, "Task completed");
  }

  async getTasksForAgent(agentId: string, filters: GetTasksFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(tasks.assignedAgentId, agentId)];

    if (filters.status !== undefined) {
      conditions.push(eq(tasks.status, filters.status));
    }

    if (filters.priority !== undefined) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    const rows = await this.tenantDb
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(sql`${tasks.dueDate} ASC NULLS LAST`)
      .limit(limit)
      .offset(offset);

    return rows;
  }
}
