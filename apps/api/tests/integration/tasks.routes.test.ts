import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTasksRoutes } from "../../src/routes/tasks.routes.js";

const mockTasksMethods = {
  createTask: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  getTasksForAgent: vi.fn(),
};

vi.mock("../../src/services/TasksService.js", () => ({
  TasksService: vi.fn().mockImplementation(() => mockTasksMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("auth", {
        userId: "user-test",
        organizationId: "org-1",
        organizationSlug: "test-org",
        role: "agent",
      });
      await next();
    }
  ),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("tenantDb", {});
      c.set("orgSlug", "test-org");
      c.set("tenantSchema", "company_test_org");
      await next();
    }
  ),
}));

function buildApp() {
  const app = new Hono();
  app.route("/tasks", createTasksRoutes());
  return app;
}

describe("GET /tasks", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con array de tareas", async () => {
    mockTasksMethods.getTasksForAgent.mockResolvedValueOnce([
      { id: "t1", title: "Llamar cliente", status: "pending", priority: "high" },
      { id: "t2", title: "Enviar propuesta", status: "in_progress", priority: "medium" },
    ]);

    const res = await app.request("/tasks");
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("debería retornar 200 con array vacío si no hay tareas", async () => {
    mockTasksMethods.getTasksForAgent.mockResolvedValueOnce([]);

    const res = await app.request("/tasks");
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("debería pasar filtros de status y priority al servicio", async () => {
    mockTasksMethods.getTasksForAgent.mockResolvedValueOnce([]);

    await app.request("/tasks?status=pending&priority=high");

    expect(mockTasksMethods.getTasksForAgent).toHaveBeenCalledWith(
      "user-test",
      expect.objectContaining({ status: "pending", priority: "high" })
    );
  });
});

describe("POST /tasks", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 con la tarea creada", async () => {
    mockTasksMethods.createTask.mockResolvedValueOnce({
      id: "task-new",
      title: "Nueva tarea",
      status: "pending",
      priority: "medium",
    });

    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nueva tarea" }),
    });

    expect(res.status).toBe(201);

    const body = await res.json() as { success: boolean; data: { id: string; status: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("task-new");
    expect(body.data.status).toBe("pending");
  });

  it("debería rechazar un body sin title con 400", async () => {
    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Sin título" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con la tarea actualizada", async () => {
    mockTasksMethods.updateTask.mockResolvedValueOnce({
      id: "task-1",
      title: "Título actualizado",
      status: "in_progress",
    });

    const res = await app.request("/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título actualizado", status: "in_progress" }),
    });

    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("task-1");
  });

  it("debería retornar 404 si la tarea no existe", async () => {
    mockTasksMethods.updateTask.mockRejectedValueOnce(new Error("TASK_NOT_FOUND"));

    const res = await app.request("/tasks/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Cambio" }),
    });

    expect(res.status).toBe(404);

    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("POST /tasks/:id/complete", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al completar una tarea existente", async () => {
    mockTasksMethods.completeTask.mockResolvedValueOnce(undefined);

    const res = await app.request("/tasks/task-1/complete", {
      method: "POST",
    });

    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: { taskId: string } };
    expect(body.success).toBe(true);
    expect(body.data.taskId).toBe("task-1");
  });

  it("debería retornar 404 si la tarea no existe", async () => {
    mockTasksMethods.completeTask.mockRejectedValueOnce(new Error("TASK_NOT_FOUND"));

    const res = await app.request("/tasks/ghost-task/complete", {
      method: "POST",
    });

    expect(res.status).toBe(404);

    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe("TASK_NOT_FOUND");
  });
});
