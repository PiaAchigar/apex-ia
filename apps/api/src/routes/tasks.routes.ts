import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TasksService } from "../services/TasksService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const taskPrioritySchema = z.enum(["low", "medium", "high"]);
const taskStatusSchema = z.enum(["pending", "in_progress", "done"]);

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assignedAgentId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.coerce.date().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  assignedAgentId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueDate: z.coerce.date().optional(),
});

const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export function createTasksRoutes() {
  const routes = new Hono();

  routes.use("*", authMiddleware);
  routes.use("*", tenantMiddleware);

  routes.get("/", zValidator("query", listTasksQuerySchema), async (c) => {
    const auth = c.get("auth");
    const tenantDb = c.get("tenantDb");
    const { status, priority, page, limit } = c.req.valid("query");

    const service = new TasksService(tenantDb);
    const taskList = await service.getTasksForAgent(auth.userId, {
      status,
      priority,
      page,
      limit,
    });

    return c.json({ success: true, data: taskList });
  });

  routes.post("/", zValidator("json", createTaskSchema), async (c) => {
    const tenantDb = c.get("tenantDb");
    const input = c.req.valid("json");

    const service = new TasksService(tenantDb);
    const created = await service.createTask(input);

    return c.json({ success: true, data: created }, 201);
  });

  routes.patch("/:taskId", zValidator("json", updateTaskSchema), async (c) => {
    const { taskId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const input = c.req.valid("json");

    const service = new TasksService(tenantDb);

    try {
      const updated = await service.updateTask(taskId, input);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error && err.message === "TASK_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "TASK_NOT_FOUND", message: "Tarea no encontrada" } },
          404
        );
      }
      throw err;
    }
  });

  routes.post("/:taskId/complete", async (c) => {
    const { taskId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const service = new TasksService(tenantDb);

    try {
      await service.completeTask(taskId);
      return c.json({ success: true, data: { taskId } });
    } catch (err) {
      if (err instanceof Error && err.message === "TASK_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "TASK_NOT_FOUND", message: "Tarea no encontrada" } },
          404
        );
      }
      throw err;
    }
  });

  return routes;
}
