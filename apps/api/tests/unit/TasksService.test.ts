import { describe, it, expect, vi, beforeEach } from "vitest";
import { TasksService } from "../../src/services/TasksService.js";

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
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(result),
  };
}

function makeSelectLimitChain(result: unknown[]) {
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

function makeUpdateReturningChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("TasksService", () => {
  let service: TasksService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TasksService(mockDb as never);
  });

  describe("createTask", () => {
    it("debería retornar una tarea con id y status 'pending'", async () => {
      mockDb.insert.mockReturnValueOnce(
        makeInsertChain([
          {
            id: "task-1",
            title: "Llamar al cliente",
            status: "pending",
            priority: "medium",
            createdAt: new Date(),
          },
        ])
      );

      const result = await service.createTask({ title: "Llamar al cliente" });

      expect(result.id).toBe("task-1");
      expect(result.status).toBe("pending");
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("debería lanzar error si el insert no retorna nada", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(service.createTask({ title: "Tarea vacía" })).rejects.toThrow(
        "Failed to create task"
      );
    });

    it("debería usar priority 'medium' por defecto", async () => {
      const insertMock = makeInsertChain([
        { id: "task-2", title: "Sin prioridad", status: "pending", priority: "medium" },
      ]);
      mockDb.insert.mockReturnValueOnce(insertMock);

      await service.createTask({ title: "Sin prioridad" });

      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "medium", status: "pending" })
      );
    });
  });

  describe("updateTask", () => {
    it("debería lanzar TASK_NOT_FOUND si la tarea no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(
        service.updateTask("nonexistent-id", { title: "Nuevo título" })
      ).rejects.toThrow("TASK_NOT_FOUND");
    });

    it("debería actualizar y retornar la tarea si existe", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "task-1" }])
      );

      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([
          { id: "task-1", title: "Título actualizado", status: "in_progress" },
        ])
      );

      const result = await service.updateTask("task-1", {
        title: "Título actualizado",
        status: "in_progress",
      });

      expect(result.id).toBe("task-1");
      expect(result.title).toBe("Título actualizado");
      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("completeTask", () => {
    it("debería lanzar TASK_NOT_FOUND si la tarea no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.completeTask("ghost-task")).rejects.toThrow(
        "TASK_NOT_FOUND"
      );
    });

    it("debería setear status 'done' y completedAt si la tarea existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([{ id: "task-1" }]));

      const updateMock = makeUpdateChain();
      mockDb.update.mockReturnValueOnce(updateMock);

      await service.completeTask("task-1");

      expect(mockDb.update).toHaveBeenCalledOnce();
      expect(updateMock.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" })
      );
    });
  });

  describe("getTasksForAgent", () => {
    it("debería retornar un array de tareas filtradas para el agente", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectChain([
          { id: "t1", assignedAgentId: "agent-1", status: "pending" },
          { id: "t2", assignedAgentId: "agent-1", status: "pending" },
        ])
      );

      const result = await service.getTasksForAgent("agent-1", { status: "pending" });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("t1");
    });

    it("debería retornar array vacío si no hay tareas para el agente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      const result = await service.getTasksForAgent("agent-nobody", {});

      expect(result).toHaveLength(0);
    });

    it("debería aplicar paginación con page y limit correctos", async () => {
      const chain = makeSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      await service.getTasksForAgent("agent-1", { page: 2, limit: 10 });

      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.offset).toHaveBeenCalledWith(10);
    });
  });
});
