import { describe, it, expect, vi, beforeEach } from "vitest";
import { PipelineService } from "../../src/services/PipelineService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
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
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PipelineService", () => {
  let service: PipelineService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PipelineService(mockDb as never);
  });

  describe("createPipeline", () => {
    it("debería retornar la pipeline creada con id", async () => {
      mockDb.insert.mockReturnValueOnce(
        makeInsertChain([{ id: "pipeline-1", name: "Ventas", isDefault: false, createdAt: new Date() }])
      );

      const result = await service.createPipeline("Ventas");

      expect(result.id).toBe("pipeline-1");
      expect(result.name).toBe("Ventas");
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("debería lanzar error si el insert no retorna nada", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(service.createPipeline("Ventas")).rejects.toThrow(
        "Failed to create pipeline"
      );
    });
  });

  describe("updatePipelineStages", () => {
    it("debería lanzar PIPELINE_NOT_FOUND si la pipeline no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        service.updatePipelineStages("pipeline-ghost", [
          { name: "Nuevo", order: 0 },
        ])
      ).rejects.toThrow("PIPELINE_NOT_FOUND");
    });

    it("debería eliminar stages existentes e insertar los nuevos", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: "pipeline-1" }]));
      mockDb.delete.mockReturnValueOnce(makeDeleteChain());
      mockDb.insert.mockReturnValueOnce(
        makeInsertChain([
          { id: "stage-1", pipelineId: "pipeline-1", name: "Contactado", order: 0, color: "#10B981" },
          { id: "stage-2", pipelineId: "pipeline-1", name: "Propuesta", order: 1, color: null },
        ])
      );

      const result = await service.updatePipelineStages("pipeline-1", [
        { name: "Contactado", order: 0, color: "#10B981" },
        { name: "Propuesta", order: 1 },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Contactado");
      expect(mockDb.delete).toHaveBeenCalledOnce();
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });
  });

  describe("createDeal", () => {
    it("debería retornar el deal creado con id", async () => {
      mockDb.insert.mockReturnValueOnce(
        makeInsertChain([
          {
            id: "deal-1",
            title: "Proyecto Alpha",
            pipelineId: "pipeline-1",
            stageId: "stage-1",
            contactId: null,
            amount: "5000.00",
            probability: 50,
            assignedAgentId: null,
            closedDate: null,
            createdAt: new Date(),
          },
        ])
      );

      const result = await service.createDeal({
        title: "Proyecto Alpha",
        pipelineId: "pipeline-1",
        stageId: "stage-1",
        amount: "5000.00",
        probability: 50,
      });

      expect(result.id).toBe("deal-1");
      expect(result.title).toBe("Proyecto Alpha");
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("debería lanzar error si el insert no retorna nada", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(
        service.createDeal({
          title: "Fallido",
          pipelineId: "pipeline-1",
          stageId: "stage-1",
        })
      ).rejects.toThrow("Failed to create deal");
    });
  });

  describe("updateDeal", () => {
    it("debería lanzar DEAL_NOT_FOUND si el deal no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        service.updateDeal("deal-ghost", { title: "Nuevo título" })
      ).rejects.toThrow("DEAL_NOT_FOUND");
    });

    it("debería actualizar correctamente si el deal existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: "deal-1" }]));
      mockDb.update.mockReturnValueOnce(makeUpdateChain());

      await expect(
        service.updateDeal("deal-1", { title: "Actualizado", probability: 80 })
      ).resolves.not.toThrow();

      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("deleteDeal", () => {
    it("debería lanzar DEAL_NOT_FOUND si el deal no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(service.deleteDeal("deal-ghost")).rejects.toThrow(
        "DEAL_NOT_FOUND"
      );
    });

    it("debería eliminar correctamente si el deal existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: "deal-1" }]));
      mockDb.delete.mockReturnValueOnce(makeDeleteChain());

      await expect(service.deleteDeal("deal-1")).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalledOnce();
    });
  });

  describe("moveDealToStage", () => {
    it("debería lanzar STAGE_NOT_FOUND si el stage no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        service.moveDealToStage("deal-1", "stage-ghost")
      ).rejects.toThrow("STAGE_NOT_FOUND");
    });

    it("debería actualizar el stageId del deal si el stage existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([{ id: "stage-2" }]));
      mockDb.update.mockReturnValueOnce(makeUpdateChain());

      await expect(
        service.moveDealToStage("deal-1", "stage-2")
      ).resolves.not.toThrow();

      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("getDealsGroupedByStage", () => {
    it("debería retornar stages con deals agrupados correctamente", async () => {
      const stagesResult = [
        { id: "stage-1", pipelineId: "pipeline-1", name: "Nuevo", order: 0, color: null },
        { id: "stage-2", pipelineId: "pipeline-1", name: "Contactado", order: 1, color: "#10B981" },
      ];

      const dealsResult = [
        {
          id: "deal-1",
          title: "Deal A",
          pipelineId: "pipeline-1",
          stageId: "stage-1",
          contactId: null,
          amount: null,
          probability: 0,
          closedDate: null,
          assignedAgentId: null,
          createdAt: new Date(),
        },
        {
          id: "deal-2",
          title: "Deal B",
          pipelineId: "pipeline-1",
          stageId: "stage-2",
          contactId: null,
          amount: "1000.00",
          probability: 60,
          closedDate: null,
          assignedAgentId: null,
          createdAt: new Date(),
        },
        {
          id: "deal-3",
          title: "Deal C",
          pipelineId: "pipeline-1",
          stageId: "stage-1",
          contactId: null,
          amount: null,
          probability: 0,
          closedDate: null,
          assignedAgentId: null,
          createdAt: new Date(),
        },
      ];

      // First select: stages (with orderBy returning resolved value)
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(stagesResult),
        })
        // Second select: deals (with where returning resolved value)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(dealsResult),
        });

      const result = await service.getDealsGroupedByStage("pipeline-1");

      expect(result.stages).toHaveLength(2);
      expect(result.stages[0]?.id).toBe("stage-1");
      expect(result.stages[0]?.deals).toHaveLength(2);
      expect(result.stages[1]?.id).toBe("stage-2");
      expect(result.stages[1]?.deals).toHaveLength(1);
      expect(result.stages[1]?.deals[0]?.title).toBe("Deal B");
    });

    it("debería retornar stages vacíos si no hay deals", async () => {
      const stagesResult = [
        { id: "stage-1", pipelineId: "pipeline-1", name: "Nuevo", order: 0, color: null },
      ];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(stagesResult),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        });

      const result = await service.getDealsGroupedByStage("pipeline-1");

      expect(result.stages).toHaveLength(1);
      expect(result.stages[0]?.deals).toHaveLength(0);
    });
  });
});
