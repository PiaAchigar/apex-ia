import { eq, and } from "drizzle-orm";
import { flows } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";
import { AiResponseService } from "./AiResponseService.js";

type FlowNodeData = {
  label?: string | undefined;
  triggerType?: string | undefined;
  message?: string | undefined;
  delaySeconds?: number | undefined;
  conditionField?: string | undefined;
  conditionOperator?: "equals" | "not_equals" | "contains" | "starts_with" | undefined;
  conditionValue?: string | undefined;
  prompt?: string | undefined;
  subFlowId?: string | undefined;
  [key: string]: unknown;
};

type FlowNode = {
  id: string;
  type: string;
  data: FlowNodeData;
  position: { x: number; y: number };
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | undefined;
};

export type NodeExecution = {
  nodeId: string;
  type: string;
  status: "executed" | "skipped";
  output?: Record<string, unknown> | undefined;
};

export type ExecutionResult = {
  steps: NodeExecution[];
  completed: boolean;
};

type CreateFlowInput = {
  name: string;
  triggerType?: string | undefined;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type UpdateFlowInput = Partial<{
  name?: string | undefined;
  triggerType?: string | undefined;
  nodes?: FlowNode[] | undefined;
  edges?: FlowEdge[] | undefined;
}>;

export class FlowBuilderService {
  constructor(private readonly tenantDb: DrizzleDb, private readonly organizationId?: string) {}

  async createFlow(input: CreateFlowInput) {
    const [created] = await this.tenantDb
      .insert(flows)
      .values({
        name: input.name,
        triggerType: input.triggerType,
        nodesJson: input.nodes as never,
        edgesJson: input.edges as never,
        isActive: false,
        version: 1,
      })
      .returning();

    if (!created) throw new Error("Failed to create flow");

    logger.info({ flowId: created.id }, "Flow created");
    return created;
  }

  async updateFlow(id: string, input: UpdateFlowInput) {
    const existing = await this.tenantDb
      .select({ id: flows.id })
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("FLOW_NOT_FOUND");

    const [updated] = await this.tenantDb
      .update(flows)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.triggerType !== undefined && { triggerType: input.triggerType }),
        ...(input.nodes !== undefined && { nodesJson: input.nodes as never }),
        ...(input.edges !== undefined && { edgesJson: input.edges as never }),
      })
      .where(eq(flows.id, id))
      .returning();

    if (!updated) throw new Error("Failed to update flow");

    logger.info({ flowId: id }, "Flow updated");
    return updated;
  }

  async activateFlow(id: string) {
    const existing = await this.tenantDb
      .select({ id: flows.id })
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("FLOW_NOT_FOUND");

    await this.tenantDb
      .update(flows)
      .set({ isActive: true })
      .where(eq(flows.id, id));

    logger.info({ flowId: id }, "Flow activated");
  }

  async deactivateFlow(id: string) {
    const existing = await this.tenantDb
      .select({ id: flows.id })
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("FLOW_NOT_FOUND");

    await this.tenantDb
      .update(flows)
      .set({ isActive: false })
      .where(eq(flows.id, id));

    logger.info({ flowId: id }, "Flow deactivated");
  }

  async getFlows() {
    return this.tenantDb.select().from(flows).orderBy(flows.createdAt);
  }

  async getFlowById(id: string) {
    const [flow] = await this.tenantDb
      .select()
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    if (!flow) throw new Error("FLOW_NOT_FOUND");
    return flow;
  }

  async deleteFlow(id: string) {
    const existing = await this.tenantDb
      .select({ id: flows.id })
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("FLOW_NOT_FOUND");

    await this.tenantDb.delete(flows).where(eq(flows.id, id));
    logger.info({ flowId: id }, "Flow deleted");
  }

  async getActiveFlowsByTriggerType(triggerType: string) {
    return this.tenantDb
      .select()
      .from(flows)
      .where(and(eq(flows.isActive, true), eq(flows.triggerType, triggerType)));
  }

  async executeFlow(
    flowNodes: FlowNode[],
    flowEdges: FlowEdge[],
    triggerData: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const nodeMap = new Map(flowNodes.map((n) => [n.id, n]));
    const edgesBySource = new Map<string, FlowEdge[]>();

    for (const edge of flowEdges) {
      const existing = edgesBySource.get(edge.source) ?? [];
      existing.push(edge);
      edgesBySource.set(edge.source, existing);
    }

    const triggerNode = flowNodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      return { steps: [], completed: false };
    }

    const steps: NodeExecution[] = [];
    const visited = new Set<string>();

    await this.traverseNode(triggerNode, nodeMap, edgesBySource, triggerData, steps, visited);

    return { steps, completed: true };
  }

  private async traverseNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    edgesBySource: Map<string, FlowEdge[]>,
    data: Record<string, unknown>,
    steps: NodeExecution[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    const step: NodeExecution = { nodeId: node.id, type: node.type, status: "executed" };

    switch (node.type) {
      case "trigger":
        step.output = { triggerType: node.data.triggerType };
        break;

      case "condition": {
        const result = this.evaluateCondition(node, data);
        step.output = { result };
        steps.push(step);
        const outEdges = edgesBySource.get(node.id) ?? [];
        const matchingEdge = outEdges.find(
          (e) => e.sourceHandle === (result ? "true" : "false")
        );
        if (matchingEdge) {
          const next = nodeMap.get(matchingEdge.target);
          if (next) await this.traverseNode(next, nodeMap, edgesBySource, data, steps, visited);
        }
        return;
      }

      case "send_message":
        step.output = { message: node.data.message };
        break;

      case "delay":
        step.output = { delaySeconds: node.data.delaySeconds };
        break;

      case "ai_response": {
        const aiService = new AiResponseService(this.tenantDb, this.organizationId);
        const systemPrompt = node.data.prompt ?? "Eres un asistente de atención al cliente.";
        const userMessage = String(data["messageText"] ?? "");
        const preferredProvider = typeof node.data.preferredProvider === "string"
          ? (node.data.preferredProvider as "anthropic" | "openai" | "gemini" | "openrouter")
          : undefined;
        try {
          const aiResponse = await aiService.generateAiResponseWithFallback(
            systemPrompt, userMessage, preferredProvider
          );
          step.output = { aiResponse };
        } catch (error) {
          logger.warn({ error, nodeId: node.id }, "AI response generation failed");
          step.output = { error: "AI_GENERATION_FAILED" };
          step.status = "skipped";
        }
        break;
      }

      case "sub_flow":
        step.output = { subFlowId: node.data.subFlowId };
        break;

      default:
        step.status = "skipped";
    }

    steps.push(step);

    const outEdges = edgesBySource.get(node.id) ?? [];
    for (const edge of outEdges) {
      const next = nodeMap.get(edge.target);
      if (next) await this.traverseNode(next, nodeMap, edgesBySource, data, steps, visited);
    }
  }

  private evaluateCondition(node: FlowNode, data: Record<string, unknown>): boolean {
    const { conditionField, conditionOperator, conditionValue } = node.data;
    if (!conditionField) return true;
    const fieldValue = String(data[conditionField] ?? "");
    const expected = conditionValue ?? "";
    switch (conditionOperator) {
      case "equals":
        return fieldValue === expected;
      case "not_equals":
        return fieldValue !== expected;
      case "contains":
        return fieldValue.includes(expected);
      case "starts_with":
        return fieldValue.startsWith(expected);
      default:
        return true;
    }
  }
}
