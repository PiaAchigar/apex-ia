import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignService } from "../../src/services/CampaignService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
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

const sampleCampaign = {
  id: "camp-1",
  name: "Black Friday",
  channel: "whatsapp",
  messageContent: "Oferta especial!",
  status: "draft",
  targetCount: 100,
  sentCount: 0,
  failedCount: 0,
  scheduledAt: null,
  completedAt: null,
  createdAt: new Date(),
};

describe("CampaignService", () => {
  let service: CampaignService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CampaignService(mockDb as never, mockQueue as never);
  });

  describe("createCampaign", () => {
    it("debería crear y retornar una campaña con status 'draft'", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([sampleCampaign]));

      const result = await service.createCampaign({
        name: "Black Friday",
        channel: "whatsapp",
        messageContent: "Oferta especial!",
      });

      expect(result.id).toBe("camp-1");
      expect(result.status).toBe("draft");
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("debería lanzar error si el insert falla", async () => {
      mockDb.insert.mockReturnValueOnce(makeInsertChain([]));

      await expect(
        service.createCampaign({ name: "X", channel: "whatsapp", messageContent: "Y" })
      ).rejects.toThrow("Failed to create campaign");
    });
  });

  describe("updateCampaign", () => {
    it("debería lanzar CAMPAIGN_NOT_FOUND si la campaña no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.updateCampaign("ghost", { name: "X" })).rejects.toThrow(
        "CAMPAIGN_NOT_FOUND"
      );
    });

    it("debería lanzar CAMPAIGN_NOT_EDITABLE si el status no es 'draft'", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "scheduled" }])
      );

      await expect(service.updateCampaign("camp-1", { name: "X" })).rejects.toThrow(
        "CAMPAIGN_NOT_EDITABLE"
      );
    });

    it("debería actualizar la campaña si está en draft", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "draft" }])
      );
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleCampaign, name: "Nuevo nombre" }])
      );

      const result = await service.updateCampaign("camp-1", { name: "Nuevo nombre" });

      expect(result.name).toBe("Nuevo nombre");
    });
  });

  describe("getCampaigns", () => {
    it("debería retornar un array de campañas", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectOrderChain([sampleCampaign]));

      const result = await service.getCampaigns();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("camp-1");
    });
  });

  describe("getCampaignById", () => {
    it("debería retornar la campaña por id", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([sampleCampaign]));

      const result = await service.getCampaignById("camp-1");

      expect(result.id).toBe("camp-1");
    });

    it("debería lanzar CAMPAIGN_NOT_FOUND si no existe", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectLimitChain([]));

      await expect(service.getCampaignById("ghost")).rejects.toThrow("CAMPAIGN_NOT_FOUND");
    });
  });

  describe("scheduleCampaign", () => {
    it("debería programar la campaña y encolar el job", async () => {
      const scheduledAt = new Date(Date.now() + 60000);
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "draft" }])
      );
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleCampaign, status: "scheduled", scheduledAt }])
      );

      const result = await service.scheduleCampaign("camp-1", "acme", scheduledAt);

      expect(result.status).toBe("scheduled");
      expect(mockQueue.add).toHaveBeenCalledOnce();
    });

    it("debería lanzar CAMPAIGN_NOT_SCHEDULABLE si no está en draft", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "running" }])
      );

      await expect(
        service.scheduleCampaign("camp-1", "acme", new Date())
      ).rejects.toThrow("CAMPAIGN_NOT_SCHEDULABLE");
    });
  });

  describe("pauseCampaign / resumeCampaign / cancelCampaign", () => {
    it("debería pausar una campaña en running", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "running" }])
      );
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleCampaign, status: "paused" }])
      );

      const result = await service.pauseCampaign("camp-1");

      expect(result.status).toBe("paused");
    });

    it("debería lanzar CAMPAIGN_NOT_RUNNING al pausar una campaña que no está corriendo", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "draft" }])
      );

      await expect(service.pauseCampaign("camp-1")).rejects.toThrow("CAMPAIGN_NOT_RUNNING");
    });

    it("debería resumir una campaña en paused", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "paused" }])
      );
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleCampaign, status: "running" }])
      );

      const result = await service.resumeCampaign("camp-1");

      expect(result.status).toBe("running");
    });

    it("debería cancelar una campaña en cualquier estado cancelable", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "scheduled" }])
      );
      mockDb.update.mockReturnValueOnce(
        makeUpdateReturningChain([{ ...sampleCampaign, status: "cancelled" }])
      );

      const result = await service.cancelCampaign("camp-1");

      expect(result.status).toBe("cancelled");
    });

    it("debería lanzar CAMPAIGN_NOT_CANCELLABLE si ya está completada", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ id: "camp-1", status: "completed" }])
      );

      await expect(service.cancelCampaign("camp-1")).rejects.toThrow("CAMPAIGN_NOT_CANCELLABLE");
    });
  });

  describe("getCampaignMetrics", () => {
    it("debería calcular métricas correctamente", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([
          { ...sampleCampaign, targetCount: 100, sentCount: 80, failedCount: 5 },
        ])
      );

      const metrics = await service.getCampaignMetrics("camp-1");

      expect(metrics.targetCount).toBe(100);
      expect(metrics.sentCount).toBe(80);
      expect(metrics.failedCount).toBe(5);
      expect(metrics.pendingCount).toBe(15);
      expect(metrics.deliveryRate).toBe(80);
    });

    it("debería retornar deliveryRate 0 si targetCount es 0", async () => {
      mockDb.select.mockReturnValueOnce(
        makeSelectLimitChain([{ ...sampleCampaign, targetCount: 0, sentCount: 0, failedCount: 0 }])
      );

      const metrics = await service.getCampaignMetrics("camp-1");

      expect(metrics.deliveryRate).toBe(0);
    });
  });
});
