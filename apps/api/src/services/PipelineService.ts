import { eq } from "drizzle-orm";
import {
  pipelines,
  pipelineStages,
  deals,
} from "@apex-ia/database/schema/tenant";
import type {
  Pipeline,
  PipelineStage,
  Deal,
} from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export type StageWithDeals = PipelineStage & { deals: Deal[] };

export type CreateDealInput = {
  title: string;
  pipelineId: string;
  stageId: string;
  contactId?: string;
  amount?: string;
  probability?: number;
  assignedAgentId?: string;
};

export type UpdateDealInput = Partial<{
  title: string;
  stageId: string;
  amount: string;
  probability: number;
  assignedAgentId: string;
  closedDate: Date;
}>;

export type StageInput = {
  id?: string;
  name: string;
  order: number;
  color?: string;
};

export class PipelineService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async createPipeline(name: string): Promise<Pipeline> {
    const [pipeline] = await this.tenantDb
      .insert(pipelines)
      .values({ name })
      .returning();

    if (!pipeline) {
      throw new Error("Failed to create pipeline");
    }

    logger.info({ pipelineId: pipeline.id, name }, "Pipeline created");

    return pipeline;
  }

  async updatePipelineStages(
    pipelineId: string,
    stages: StageInput[]
  ): Promise<PipelineStage[]> {
    const existing = await this.tenantDb
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("PIPELINE_NOT_FOUND");
    }

    await this.tenantDb
      .delete(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId));

    const stagesToInsert = stages.map((s) => ({
      pipelineId,
      name: s.name,
      order: s.order,
      color: s.color ?? null,
    }));

    const created = await this.tenantDb
      .insert(pipelineStages)
      .values(stagesToInsert)
      .returning();

    logger.info(
      { pipelineId, stageCount: created.length },
      "Pipeline stages updated"
    );

    return created;
  }

  async createDeal(input: CreateDealInput): Promise<Deal> {
    const [deal] = await this.tenantDb
      .insert(deals)
      .values({
        title: input.title,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        contactId: input.contactId ?? null,
        amount: input.amount ?? null,
        probability: input.probability ?? 0,
        assignedAgentId: input.assignedAgentId ?? null,
      })
      .returning();

    if (!deal) {
      throw new Error("Failed to create deal");
    }

    logger.info({ dealId: deal.id, title: input.title }, "Deal created");

    return deal;
  }

  async updateDeal(id: string, input: UpdateDealInput): Promise<void> {
    const existing = await this.tenantDb
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new Error("DEAL_NOT_FOUND");
    }

    await this.tenantDb.update(deals).set(input).where(eq(deals.id, id));

    logger.info({ dealId: id }, "Deal updated");
  }

  async deleteDeal(id: string): Promise<void> {
    const existing = await this.tenantDb
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new Error("DEAL_NOT_FOUND");
    }

    await this.tenantDb.delete(deals).where(eq(deals.id, id));

    logger.info({ dealId: id }, "Deal deleted");
  }

  async moveDealToStage(dealId: string, targetStageId: string): Promise<void> {
    const stage = await this.tenantDb
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, targetStageId))
      .limit(1);

    if (!stage[0]) {
      throw new Error("STAGE_NOT_FOUND");
    }

    await this.tenantDb
      .update(deals)
      .set({ stageId: targetStageId })
      .where(eq(deals.id, dealId));

    logger.info({ dealId, targetStageId }, "Deal moved to stage");
  }

  async getDealsGroupedByStage(
    pipelineId: string
  ): Promise<{ stages: StageWithDeals[] }> {
    const stageRows = await this.tenantDb
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy(pipelineStages.order);

    const dealRows = await this.tenantDb
      .select()
      .from(deals)
      .where(eq(deals.pipelineId, pipelineId));

    const stagesWithDeals: StageWithDeals[] = stageRows.map((stage) => ({
      ...stage,
      deals: dealRows.filter((deal) => deal.stageId === stage.id),
    }));

    return { stages: stagesWithDeals };
  }
}
