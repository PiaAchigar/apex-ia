import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlowBuilderService } from "../../src/services/FlowBuilderService.js";
import { AiResponseService } from "../../src/services/AiResponseService.js";
import type { DrizzleDb } from "../../src/db/drizzle.js";

vi.mock("../../src/services/AiResponseService.js");

describe("FlowBuilderService — AI Response Node", () => {
  let tenantDb: Partial<DrizzleDb>;
  let service: FlowBuilderService;

  beforeEach(() => {
    tenantDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    } as never;

    service = new FlowBuilderService(tenantDb as DrizzleDb, "org-123");
  });

  it("executeFlow retorna step ai_response con output.aiResponse cuando AiResponseService tiene éxito", async () => {
    const mockAiResponse = "Hola, ¿en qué puedo ayudarte?";
    vi.mocked(AiResponseService).prototype.generateAiResponseWithFallback = vi
      .fn()
      .mockResolvedValue(mockAiResponse);

    const nodes = [
      {
        id: "trigger_1",
        type: "trigger",
        data: { triggerType: "incoming_message" },
        position: { x: 0, y: 0 },
      },
      {
        id: "ai_1",
        type: "ai_response",
        data: { prompt: "Eres un asistente de atención al cliente." },
        position: { x: 100, y: 0 },
      },
    ];

    const edges = [
      { id: "edge_1", source: "trigger_1", target: "ai_1" },
    ];

    const result = await service.executeFlow(nodes, edges, { messageText: "Hola" });

    expect(result.completed).toBe(true);
    expect(result.steps).toHaveLength(2);

    const aiStep = result.steps.find((s) => s.type === "ai_response");
    expect(aiStep).toBeDefined();
    expect(aiStep?.status).toBe("executed");
    expect(aiStep?.output?.["aiResponse"]).toBe(mockAiResponse);
  });

  it("executeFlow marca step ai_response como 'skipped' y output.error cuando AI falla", async () => {
    vi.mocked(AiResponseService).prototype.generateAiResponseWithFallback = vi
      .fn()
      .mockRejectedValue(new Error("AI_SERVICE_ERROR"));

    const nodes = [
      {
        id: "trigger_1",
        type: "trigger",
        data: { triggerType: "incoming_message" },
        position: { x: 0, y: 0 },
      },
      {
        id: "ai_1",
        type: "ai_response",
        data: { prompt: "Test prompt" },
        position: { x: 100, y: 0 },
      },
    ];

    const edges = [
      { id: "edge_1", source: "trigger_1", target: "ai_1" },
    ];

    const result = await service.executeFlow(nodes, edges, { messageText: "Hola" });

    const aiStep = result.steps.find((s) => s.type === "ai_response");
    expect(aiStep?.status).toBe("skipped");
    expect(aiStep?.output?.["error"]).toBe("AI_GENERATION_FAILED");
  });

  it("getActiveFlowsByTriggerType retorna solo flows activos con el triggerType dado", async () => {
    const mockFlows = [
      { id: "flow_1", triggerType: "incoming_message", isActive: true },
      { id: "flow_2", triggerType: "incoming_message", isActive: true },
    ];

    (tenantDb.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockFlows),
      }),
    });

    const result = await service.getActiveFlowsByTriggerType("incoming_message");

    expect(result).toEqual(mockFlows);
    expect(tenantDb.select).toHaveBeenCalled();
  });

  it("executeFlow completa flujo multi-nodo: trigger → ai_response → send_message (3 steps)", async () => {
    const mockAiResponse = "Response message";
    vi.mocked(AiResponseService).prototype.generateAiResponseWithFallback = vi
      .fn()
      .mockResolvedValue(mockAiResponse);

    const nodes = [
      {
        id: "trigger_1",
        type: "trigger",
        data: { triggerType: "incoming_message" },
        position: { x: 0, y: 0 },
      },
      {
        id: "ai_1",
        type: "ai_response",
        data: { prompt: "Test prompt" },
        position: { x: 100, y: 0 },
      },
      {
        id: "send_1",
        type: "send_message",
        data: { message: "Enviar respuesta" },
        position: { x: 200, y: 0 },
      },
    ];

    const edges = [
      { id: "edge_1", source: "trigger_1", target: "ai_1" },
      { id: "edge_2", source: "ai_1", target: "send_1" },
    ];

    const result = await service.executeFlow(nodes, edges, { messageText: "Hola" });

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].type).toBe("trigger");
    expect(result.steps[1].type).toBe("ai_response");
    expect(result.steps[2].type).toBe("send_message");
  });

  it("executeFlow sin organizationId no lanza excepción (usa fallback)", async () => {
    const mockAiResponse = "Response text";
    vi.mocked(AiResponseService).prototype.generateAiResponseWithFallback = vi
      .fn()
      .mockResolvedValue(mockAiResponse);

    const serviceNoOrg = new FlowBuilderService(tenantDb as DrizzleDb);

    const nodes = [
      {
        id: "trigger_1",
        type: "trigger",
        data: { triggerType: "incoming_message" },
        position: { x: 0, y: 0 },
      },
      {
        id: "ai_1",
        type: "ai_response",
        data: { prompt: "Test" },
        position: { x: 100, y: 0 },
      },
    ];

    const edges = [
      { id: "edge_1", source: "trigger_1", target: "ai_1" },
    ];

    const result = await serviceNoOrg.executeFlow(nodes, edges, { messageText: "Hi" });

    expect(result.completed).toBe(true);
    const aiStep = result.steps.find((s) => s.type === "ai_response");
    expect(aiStep?.output?.["aiResponse"]).toBe(mockAiResponse);
  });
});
