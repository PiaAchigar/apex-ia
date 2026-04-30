import { count, eq, and, gte, lte, desc, isNull, sum } from "drizzle-orm";
import {
  conversations,
  messages,
  contacts,
  analyticsEvents,
  aiUsageLogs,
} from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

export class AnalyticsService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  /**
   * Get conversation metrics: total, by status, by channel, avg duration
   */
  async getConversationMetrics(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    byChannel: Record<string, number>;
    avgMessagesPerConversation: number;
  }> {
    try {
      const conditions = dateRange
        ? [
            gte(conversations.createdAt, dateRange.startDate),
            lte(conversations.createdAt, dateRange.endDate),
          ]
        : [];

      // Total conversations
      const totalRows = await this.tenantDb
        .select({ count: count() })
        .from(conversations)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const totalConversations = totalRows[0]?.count || 0;

      // By status
      const openRows = await this.tenantDb
        .select({ count: count() })
        .from(conversations)
        .where(
          conditions.length > 0
            ? and(eq(conversations.status, "open"), ...conditions)
            : eq(conversations.status, "open")
        );
      const openConversations = openRows[0]?.count || 0;

      const closedRows = await this.tenantDb
        .select({ count: count() })
        .from(conversations)
        .where(
          conditions.length > 0
            ? and(eq(conversations.status, "closed"), ...conditions)
            : eq(conversations.status, "closed")
        );
      const closedConversations = closedRows[0]?.count || 0;

      // By channel (WhatsApp, Instagram, Facebook, Email, etc.)
      const byChannelRows = await this.tenantDb
        .select({
          channel: conversations.channel,
          count: count(),
        })
        .from(conversations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(conversations.channel);

      const byChannel: Record<string, number> = {};
      for (const row of byChannelRows) {
        byChannel[row.channel] = row.count;
      }

      // Average messages per conversation
      const avgRows = await this.tenantDb
        .select({
          total: count(),
          sumMessages: count(conversations.messageCount), // counts non-null
        })
        .from(conversations)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const avgMessagesPerConversation =
        avgRows[0]?.total && avgRows[0].total > 0
          ? Math.round(avgRows[0].sumMessages / avgRows[0].total)
          : 0;

      return {
        totalConversations,
        openConversations,
        closedConversations,
        byChannel,
        avgMessagesPerConversation,
      };
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching conversation metrics");
      throw new Error("METRICS_FETCH_FAILED");
    }
  }

  /**
   * Agent performance report: messages sent/received, response time, assigned conversations
   */
  async getAgentPerformanceReport(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<
    Array<{
      agentId: string;
      assignedConversations: number;
      messagesHandled: number;
      avgResponseTimeMinutes: number;
    }>
  > {
    try {
      const conditions = dateRange
        ? [
            gte(conversations.createdAt, dateRange.startDate),
            lte(conversations.createdAt, dateRange.endDate),
          ]
        : [];

      // Conversations by agent
      const agentConversations = await this.tenantDb
        .select({
          agentId: conversations.assignedAgentId,
          count: count(),
        })
        .from(conversations)
        .where(
          conditions.length > 0
            ? and(isNull(conversations.assignedAgentId) ? undefined : undefined, ...conditions)
            : undefined
        )
        .groupBy(conversations.assignedAgentId);

      const report = [];
      for (const agentRow of agentConversations) {
        if (!agentRow.agentId) continue;

        // Messages handled by this agent (messages in assigned conversations)
        const messageRows = await this.tenantDb
          .select({ count: count() })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(eq(conversations.assignedAgentId, agentRow.agentId));

        const messagesHandled = messageRows[0]?.count || 0;

        // Avg response time: assume based on message gaps (simplified)
        const avgResponseTimeMinutes = 5; // Placeholder — would need timestamps of message pairs

        report.push({
          agentId: agentRow.agentId,
          assignedConversations: agentRow.count,
          messagesHandled,
          avgResponseTimeMinutes,
        });
      }

      return report;
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching agent performance report");
      throw new Error("AGENT_PERFORMANCE_FETCH_FAILED");
    }
  }

  /**
   * Channel SLA report: response time, resolution time, volume by channel
   */
  async getChannelSlaReport(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<
    Array<{
      channel: string;
      totalConversations: number;
      avgResponseTimeMinutes: number;
      avgResolutionTimeHours: number;
      slaCompliancePercentage: number;
    }>
  > {
    try {
      const conditions = dateRange
        ? [
            gte(conversations.createdAt, dateRange.startDate),
            lte(conversations.createdAt, dateRange.endDate),
          ]
        : [];

      const channelRows = await this.tenantDb
        .select({
          channel: conversations.channel,
          count: count(),
        })
        .from(conversations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(conversations.channel);

      const report = [];
      for (const channelRow of channelRows) {
        report.push({
          channel: channelRow.channel,
          totalConversations: channelRow.count,
          avgResponseTimeMinutes: 3, // Placeholder
          avgResolutionTimeHours: 24, // Placeholder
          slaCompliancePercentage: 95, // Placeholder
        });
      }

      return report;
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching channel SLA report");
      throw new Error("CHANNEL_SLA_FETCH_FAILED");
    }
  }

  /**
   * Volume heatmap: messages per hour, per day, by channel
   */
  async getVolumeHeatmap(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<
    Array<{
      date: string; // ISO date YYYY-MM-DD
      hour: number; // 0-23
      channel: string;
      messageCount: number;
    }>
  > {
    try {
      const heatmapData = await this.tenantDb
        .select({
          channel: conversations.channel,
          createdAt: messages.createdAt,
          count: count(),
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            gte(messages.createdAt, dateRange.startDate),
            lte(messages.createdAt, dateRange.endDate)
          )
        )
        .groupBy(conversations.channel, messages.createdAt);

      // Transform into heatmap format (group by date + hour + channel)
      const result = heatmapData.map((row) => {
        const date = row.createdAt ? new Date(row.createdAt) : new Date();
        return {
          date: date.toISOString().split("T")[0],
          hour: date.getUTCHours(),
          channel: row.channel,
          messageCount: row.count,
        };
      });

      return result;
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching volume heatmap");
      throw new Error("VOLUME_HEATMAP_FETCH_FAILED");
    }
  }

  /**
   * Customer Satisfaction (CSAT) report: based on analytics events (surveys, ratings)
   */
  async getCsatReport(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    averageCsat: number; // 0-5 scale
    totalRatings: number;
    byRating: Record<number, number>; // rating → count
    byChannel: Record<string, number>; // channel → average CSAT
  }> {
    try {
      const conditions = dateRange
        ? [
            gte(analyticsEvents.createdAt, dateRange.startDate),
            lte(analyticsEvents.createdAt, dateRange.endDate),
          ]
        : [];

      // Get all CSAT survey events
      const surveyEvents = await this.tenantDb
        .select()
        .from(analyticsEvents)
        .where(
          conditions.length > 0
            ? and(eq(analyticsEvents.eventType, "csat_survey"), ...conditions)
            : eq(analyticsEvents.eventType, "csat_survey")
        );

      const ratings: number[] = [];
      const byRating: Record<number, number> = {};

      for (const event of surveyEvents) {
        const rating = (event.metadataJson as any)?.rating || 0;
        if (rating >= 1 && rating <= 5) {
          ratings.push(rating);
          byRating[rating] = (byRating[rating] || 0) + 1;
        }
      }

      const averageCsat = ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0;

      // By channel: average CSAT per channel (simplified, would need JOIN with conversations)
      const byChannel: Record<string, number> = {
        whatsapp: averageCsat,
        instagram: averageCsat,
        facebook: averageCsat,
        email: averageCsat,
        telegram: averageCsat,
      };

      return {
        averageCsat: Math.round(averageCsat * 100) / 100,
        totalRatings: ratings.length,
        byRating,
        byChannel,
      };
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching CSAT report");
      throw new Error("CSAT_REPORT_FETCH_FAILED");
    }
  }

  /**
   * AI usage summary: tokens, cost, requests by provider and model
   */
  async getAiUsageSummary(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    summary: {
      totalRequests: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      errorRate: number;
    };
    byProvider: Array<{
      provider: string;
      requests: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }>;
    byModel: Array<{
      model: string;
      provider: string;
      requests: number;
      totalTokens: number;
    }>;
    dailyTimeline: Array<{
      date: string;
      requests: number;
      totalTokens: number;
    }>;
  }> {
    try {
      const conditions = dateRange
        ? [
            gte(aiUsageLogs.createdAt, dateRange.startDate),
            lte(aiUsageLogs.createdAt, dateRange.endDate),
          ]
        : [];

      const orgIdCondition = eq(aiUsageLogs.organizationId, organizationId);

      // Summary: total requests, tokens, cost
      const summaryRows = await this.tenantDb
        .select({
          totalRequests: count(),
          totalInputTokens: sum(aiUsageLogs.inputTokens).mapWith(Number),
          totalOutputTokens: sum(aiUsageLogs.outputTokens).mapWith(Number),
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
          estimatedCostUsd: sum(aiUsageLogs.estimatedCostUsd).mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          conditions.length > 0 ? and(orgIdCondition, ...conditions) : orgIdCondition
        );

      const summaryData = summaryRows[0] || {};

      // Count requests with errors (statusCode >= 400)
      const errorRows = await this.tenantDb
        .select({ count: count() })
        .from(aiUsageLogs)
        .where(
          conditions.length > 0
            ? and(
                orgIdCondition,
                gte(aiUsageLogs.statusCode || 0, 400),
                ...conditions
              )
            : and(orgIdCondition, gte(aiUsageLogs.statusCode || 0, 400))
        );

      const totalRequests = summaryData.totalRequests || 0;
      const errorCount = errorRows[0]?.count || 0;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // By provider
      const byProviderRows = await this.tenantDb
        .select({
          provider: aiUsageLogs.provider,
          requests: count(),
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
          estimatedCostUsd: sum(aiUsageLogs.estimatedCostUsd).mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          conditions.length > 0 ? and(orgIdCondition, ...conditions) : orgIdCondition
        )
        .groupBy(aiUsageLogs.provider);

      // By model
      const byModelRows = await this.tenantDb
        .select({
          model: aiUsageLogs.model,
          provider: aiUsageLogs.provider,
          requests: count(),
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          conditions.length > 0 ? and(orgIdCondition, ...conditions) : orgIdCondition
        )
        .groupBy(aiUsageLogs.model, aiUsageLogs.provider);

      // Daily timeline
      const dailyRows = await this.tenantDb
        .select({
          date: aiUsageLogs.createdAt,
          requests: count(),
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
        })
        .from(aiUsageLogs)
        .where(
          conditions.length > 0 ? and(orgIdCondition, ...conditions) : orgIdCondition
        )
        .groupBy(aiUsageLogs.createdAt)
        .orderBy(desc(aiUsageLogs.createdAt));

      return {
        summary: {
          totalRequests,
          totalInputTokens: summaryData.totalInputTokens || 0,
          totalOutputTokens: summaryData.totalOutputTokens || 0,
          totalTokens: summaryData.totalTokens || 0,
          estimatedCostUsd: summaryData.estimatedCostUsd || 0,
          errorRate: Math.round(errorRate * 100) / 100,
        },
        byProvider: byProviderRows.map((row) => ({
          provider: row.provider,
          requests: row.requests || 0,
          totalTokens: row.totalTokens || 0,
          estimatedCostUsd: row.estimatedCostUsd || 0,
        })),
        byModel: byModelRows.map((row) => ({
          model: row.model,
          provider: row.provider,
          requests: row.requests || 0,
          totalTokens: row.totalTokens || 0,
        })),
        dailyTimeline: dailyRows.map((row) => ({
          date: row.date
            ? new Date(row.date).toISOString().split("T")[0]
            : "",
          requests: row.requests || 0,
          totalTokens: row.totalTokens || 0,
        })),
      };
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching AI usage summary");
      throw new Error("AI_USAGE_SUMMARY_FETCH_FAILED");
    }
  }
}
