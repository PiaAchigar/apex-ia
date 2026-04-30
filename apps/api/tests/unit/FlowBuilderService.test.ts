import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlowBuilderService } from "../../src/services/FlowBuilderService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function makeSelectLimitChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeSelectOrderChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
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

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

const sampleFlow = {
  id: "flow-1",
  name: "Bienvenida",
  triggerType: "new_conversation",
  nodesJson: [],
  edgesJson: [],
  isActive: false,
  version: 1,
  createdAt: new Date(),
};

describe("FlowBuilderService", () => {
  let service: FlowBuilderService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new FlowBuilderService(mockDb as never, "test-org");
  });

  describe("createFlow", () => {
    it("debería crear y retornar un flow nuevo", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([sampleFlow]));

      const result = await service.createFlow({
        name: "Bienvenida",
        triggerType: "new_conversation",
        nodes: [],
        edges: [],
      });

      expect(result.id).toBe("flow-1");
      expect(result.isActive).toBe(false);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("debería lanzar error si el insert no retorna nada", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(
        service.createFlow({ name: "Vacío", nodes: [], edges: [] })
      ).rejects.toThrow("Failed to create flow");
    });
  });

  describe("updateFlow", () => {
    it("debería lanzar FLOW_NOT_FOUND si el flow no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(
        service.updateFlow("ghost-id", { name: "Nuevo nombre" })
      ).rejects.toThrow("FLOW_NOT_FOUND");
    });

    it("debería actualizar y retornar el flow actualizado", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([{ id: "flow-1" }]));
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleFlow, name: "Actualizado" }])
      );

      const result = await service.updateFlow("flow-1", { name: "Actualizado" });

      expect(result.name).toBe("Actualizado");
    });
  });

  describe("activateFlow / deactivateFlow", () => {
    it("debería activar un flow existente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([{ id: "flow-1" }]));
      mockDb.update.mockReturnValueOnce(makeUpdateChain());

      await expect(service.activateFlow("flow-1")).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledOnce();
    });

    it("debería lanzar FLOW_NOT_FOUND al activar un flow inexistente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.activateFlow("ghost")).rejects.toThrow("FLOW_NOT_FOUND");
    });

    it("debería desactivar un flow existente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([{ id: "flow-1" }]));
      mockDb.update.mockReturnValueOnce(makeUpdateChain());

      await expect(service.deactivateFlow("flow-1")).resolves.toBeUndefined();
    });
  });

  describe("getFlows", () => {
    it("debería retornar array de flows", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectOrderChain([sampleFlow]));

      const result = await service.getFlows();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("flow-1");
    });
  });

  describe("getFlowById", () => {
    it("debería retornar el flow por id", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([sampleFlow]));

      const result = await service.getFlowById("flow-1");

      expect(result.id).toBe("flow-1");
    });

    it("debería lanzar FLOW_NOT_FOUND si no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.getFlowById("ghost")).rejects.toThrow("FLOW_NOT_FOUND");
    });
  });

  describe("deleteFlow", () => {
    it("debería eliminar un flow existente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([{ id: "flow-1" }]));
      mockDb.delete.mockReturnValueOnce(makeDeleteChain());

      await expect(service.deleteFlow("flow-1")).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalledOnce();
    });

    it("debería lanzar FLOW_NOT_FOUND al borrar un flow inexistente", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.deleteFlow("ghost")).rejects.toThrow("FLOW_NOT_FOUND");
    });
  });

  describe("executeFlow", () => {
    it("debería retornar steps vacíos si no hay nodo trigger", async () => {
      const result = await service.executeFlow([], [], {});
      expect(result.steps).toHaveLength(0);
      expect(result.completed).toBe(false);
    });

    it("debería ejecutar un flow simple trigger → send_message", async () => {
      const nodes = [
        { id: "1", type: "trigger", data: { triggerType: "new_conversation" }, position: { x: 0, y: 0 } },
        { id: "2", type: "send_message", data: { message: "Hola!" }, position: { x: 0, y: 100 } },
      ];
      const edges = [{ id: "e1-2", source: "1", target: "2" }];

      const result = await service.executeFlow(nodes, edges, {});

      expect(result.completed).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]?.type).toBe("trigger");
      expect(result.steps[1]?.type).toBe("send_message");
      expect(result.steps[1]?.output).toEqual({ message: "Hola!" });
    });

    it("debería seguir el handle 'true' en un nodo condition cuando la condición es verdadera", async () => {
      const nodes = [
        { id: "1", type: "trigger", data: {}, position: { x: 0, y: 0 } },
        {
          id: "2",
          type: "condition",
          data: { conditionField: "channel", conditionOperator: "equals", conditionValue: "whatsapp" },
          position: { x: 0, y: 100 },
        },
        { id: "3", type: "send_message", data: { message: "Para WhatsApp" }, position: { x: 0, y: 200 } },
        { id: "4", type: "send_message", data: { message: "Para otros" }, position: { x: 100, y: 200 } },
      ];
      const edges = [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3", sourceHandle: "true" },
        { id: "e2-4", source: "2", target: "4", sourceHandle: "false" },
      ];

      const result = await service.executeFlow(nodes, edges, { channel: "whatsapp" });

      expect(result.steps.some((s) => s.nodeId === "3")).toBe(true);
      expect(result.steps.some((s) => s.nodeId === "4")).toBe(false);
    });

    it("debería seguir el handle 'false' cuando la condición no se cumple", async () => {
      const nodes = [
        { id: "1", type: "trigger", data: {}, position: { x: 0, y: 0 } },
        {
          id: "2",
          type: "condition",
          data: { conditionField: "channel", conditionOperator: "equals", conditionValue: "whatsapp" },
          position: { x: 0, y: 100 },
        },
        { id: "3", type: "delay", data: { delaySeconds: 5 }, position: { x: 100, y: 200 } },
      ];
      const edges = [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3", sourceHandle: "false" },
      ];

      const result = await service.executeFlow(nodes, edges, { channel: "instagram" });

      expect(result.steps.some((s) => s.nodeId === "3")).toBe(true);
    });

    it("debería incluir el nodo delay con delaySeconds en el output", async () => {
      const nodes = [
        { id: "1", type: "trigger", data: {}, position: { x: 0, y: 0 } },
        { id: "2", type: "delay", data: { delaySeconds: 30 }, position: { x: 0, y: 100 } },
      ];
      const edges = [{ id: "e1-2", source: "1", target: "2" }];

      const result = await service.executeFlow(nodes, edges, {});

      const delayStep = result.steps.find((s) => s.type === "delay");
      expect(delayStep?.output).toEqual({ delaySeconds: 30 });
    });
  });
});
