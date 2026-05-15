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
  contactId?: string | undefined;
  amount?: string | undefined;
  probability?: number | undefined;
  assignedAgentId?: string | undefined;
};

export type UpdateDealInput = Partial<{
  title?: string | undefined;
  stageId?: string | undefined;
  amount?: string | undefined;
  probability?: number | undefined;
  assignedAgentId?: string | undefined;
  closedDate?: Date | undefined;
}>;

export type StageInput = {
  id?: string | undefined;
  name: string;
  order: number;
  color?: string | undefined;
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

  async renamePipeline(pipelineId: string, name: string): Promise<Pipeline> {
    const existing = await this.tenantDb
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("PIPELINE_NOT_FOUND");
    }

    const [updated] = await this.tenantDb
      .update(pipelines)
      .set({ name })
      .where(eq(pipelines.id, pipelineId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update pipeline");
    }

    logger.info({ pipelineId, newName: name }, "Pipeline renamed");

    return updated;
  }

  async deletePipeline(pipelineId: string): Promise<void> {
    const existing = await this.tenantDb
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("PIPELINE_NOT_FOUND");
    }

    // Delete in order: deals -> stages -> pipeline
    await this.tenantDb.delete(deals).where(eq(deals.pipelineId, pipelineId));
    await this.tenantDb
      .delete(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId));
    await this.tenantDb.delete(pipelines).where(eq(pipelines.id, pipelineId));

    logger.info({ pipelineId }, "Pipeline deleted with cascading cleanup");
  }

  async addStage(
    pipelineId: string,
    name: string,
    color?: string
  ): Promise<PipelineStage> {
    // Verify pipeline exists
    const pipeline = await this.tenantDb
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!pipeline[0]) {
      throw new Error("PIPELINE_NOT_FOUND");
    }

    // Get max order to add new stage at the end
    const maxOrderResult = await this.tenantDb
      .select({ maxOrder: pipelineStages.order })
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy((t) => t.maxOrder)
      .limit(1);

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const [stage] = await this.tenantDb
      .insert(pipelineStages)
      .values({
        pipelineId,
        name,
        order: nextOrder,
        color: color ?? null,
      })
      .returning();

    if (!stage) {
      throw new Error("Failed to create stage");
    }

    logger.info(
      { stageId: stage.id, pipelineId, name },
      "Stage added to pipeline"
    );

    return stage;
  }

  async updateStage(
    stageId: string,
    patch: { name?: string | undefined; color?: string | undefined; order?: number | undefined }
  ): Promise<PipelineStage> {
    const existing = await this.tenantDb
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("STAGE_NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.color !== undefined) updateData.color = patch.color;
    if (patch.order !== undefined) updateData.order = patch.order;

    const [updated] = await this.tenantDb
      .update(pipelineStages)
      .set(updateData)
      .where(eq(pipelineStages.id, stageId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update stage");
    }

    logger.info({ stageId, patch }, "Stage updated");

    return updated;
  }

  async deleteStage(
    stageId: string,
    targetStageId?: string
  ): Promise<void> {
    const existing = await this.tenantDb
      .select({ id: pipelineStages.id, pipelineId: pipelineStages.pipelineId })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("STAGE_NOT_FOUND");
    }

    const pipelineId = existing[0].pipelineId;

    // If targetStageId is provided, move deals to that stage before deletion
    if (targetStageId) {
      const targetExists = await this.tenantDb
        .select({ id: pipelineStages.id })
        .from(pipelineStages)
        .where(eq(pipelineStages.id, targetStageId))
        .limit(1);

      if (!targetExists[0]) {
        throw new Error("TARGET_STAGE_NOT_FOUND");
      }

      // Move deals from stageId to targetStageId
      await this.tenantDb
        .update(deals)
        .set({ stageId: targetStageId })
        .where(eq(deals.stageId, stageId));

      logger.info(
        { stageId, targetStageId },
        "Deals moved before stage deletion"
      );
    } else {
      // No target stage: delete deals in this stage
      await this.tenantDb.delete(deals).where(eq(deals.stageId, stageId));

      logger.info({ stageId }, "Deals deleted with stage");
    }

    // Delete the stage
    await this.tenantDb.delete(pipelineStages).where(eq(pipelineStages.id, stageId));

    logger.info({ stageId, pipelineId }, "Stage deleted");
  }
}
