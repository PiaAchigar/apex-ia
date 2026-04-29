import { Readable } from "stream";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { eq, and } from "drizzle-orm";
import { aiCredentials, aiUsageLogs } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { decryptCredentials } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

export class AiResponseService {
  private cachedClients: Map<string, { openai?: OpenAI; anthropic?: Anthropic }> = new Map();

  constructor(
    private readonly tenantDb?: DrizzleDb,
    private readonly organizationId?: string
  ) {}

  private async getOrCreateClient(
    provider: "anthropic" | "openai",
    apiKey: string
  ): Promise<OpenAI | Anthropic> {
    const cacheKey = `${provider}:${this.organizationId || "default"}`;
    let cached = this.cachedClients.get(cacheKey);

    if (!cached) {
      cached = {};
      this.cachedClients.set(cacheKey, cached);
    }

    if (provider === "anthropic") {
      if (!cached.anthropic) {
        cached.anthropic = new Anthropic({ apiKey });
      }
      return cached.anthropic;
    } else {
      if (!cached.openai) {
        cached.openai = new OpenAI({ apiKey });
      }
      return cached.openai;
    }
  }

  async getActiveCredential(
    provider?: "anthropic" | "openai" | "gemini" | "openrouter"
  ): Promise<{ provider: string; apiKey: string } | null> {
    if (!this.tenantDb || !this.organizationId) {
      return this.getFallbackCredential(provider);
    }

    try {
      const query = this.tenantDb
        .select()
        .from(aiCredentials)
        .where(
          and(
            eq(aiCredentials.organizationId, this.organizationId),
            eq(aiCredentials.isActive, true)
          )
        );

      const rows = await query;
      if (rows.length === 0) {
        return this.getFallbackCredential(provider);
      }

      const primary = rows.find((c) => c.isPrimary && c.provider === provider) ||
                      rows.find((c) => c.isPrimary) ||
                      rows[0];

      if (!primary) {
        return null;
      }

      const decryptedKey = decryptCredentials(primary.encryptedApiKey);
      return { provider: primary.provider, apiKey: decryptedKey };
    } catch (error) {
      logger.warn({ organizationId: this.organizationId, error }, "Error fetching AI credentials");
      return this.getFallbackCredential(provider);
    }
  }

  private getFallbackCredential(
    preferredProvider?: string
  ): { provider: string; apiKey: string } | null {
    const env = process.env;

    if (
      preferredProvider === "anthropic" ||
      (!preferredProvider && env["ANTHROPIC_API_KEY"])
    ) {
      const key = env["ANTHROPIC_API_KEY"];
      if (key) return { provider: "anthropic", apiKey: key };
    }

    if (preferredProvider === "openai" || (!preferredProvider && env["OPENAI_API_KEY"])) {
      const key = env["OPENAI_API_KEY"];
      if (key) return { provider: "openai", apiKey: key };
    }

    if (preferredProvider === "gemini" || (!preferredProvider && env["GOOGLE_GEMINI_API_KEY"])) {
      const key = env["GOOGLE_GEMINI_API_KEY"];
      if (key) return { provider: "gemini", apiKey: key };
    }

    return null;
  }

  async generateAiResponseWithFallback(
    systemPrompt: string,
    userMessage: string,
    preferredProvider?: "anthropic" | "openai" | "gemini" | "openrouter"
  ): Promise<string> {
    let lastError: Error | null = null;
    const providersToTry = [preferredProvider, "anthropic", "openai"].filter(Boolean) as string[];

    for (const provider of providersToTry) {
      try {
        const response = await this.generateAiResponse(systemPrompt, userMessage, provider as any);
        await this.logAiUsage({
          provider,
          model: this.getModelForProvider(provider as any),
          totalTokens: 0,
          endpoint: "messages.create",
          statusCode: 200,
        });
        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { provider, error: lastError.message },
          `Failed to generate AI response with ${provider}, trying next provider`
        );
      }
    }

    logger.error({ lastError }, "All AI providers failed");
    throw lastError || new Error("AI_PROVIDERS_UNAVAILABLE");
  }

  async generateAiResponse(
    systemPrompt: string,
    userMessage: string,
    provider?: "anthropic" | "openai" | "gemini" | "openrouter"
  ): Promise<string> {
    const credential = await this.getActiveCredential(provider);
    if (!credential) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    }

    if (credential.provider === "anthropic") {
      return this.generateWithAnthropic(systemPrompt, userMessage, credential.apiKey);
    } else if (credential.provider === "openai") {
      return this.generateWithOpenAI(systemPrompt, userMessage, credential.apiKey);
    } else {
      throw new Error("AI_PROVIDER_NOT_YET_IMPLEMENTED");
    }
  }

  private async generateWithAnthropic(
    systemPrompt: string,
    userMessage: string,
    apiKey: string
  ): Promise<string> {
    const client = (await this.getOrCreateClient("anthropic", apiKey)) as Anthropic;

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      return textContent.text;
    } catch (error) {
      logger.error({ error }, "Error generating AI response with Anthropic");
      throw error;
    }
  }

  private async generateWithOpenAI(
    systemPrompt: string,
    userMessage: string,
    apiKey: string
  ): Promise<string> {
    const client = (await this.getOrCreateClient("openai", apiKey)) as OpenAI;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const firstChoice = response.choices[0];
      if (!firstChoice || !firstChoice.message || firstChoice.message.content === null) {
        throw new Error("No content in response");
      }

      return firstChoice.message.content;
    } catch (error) {
      logger.error({ error }, "Error generating AI response with OpenAI");
      throw error;
    }
  }

  async transcribeAudioMessage(audioBuffer: Buffer, _mimeType: string): Promise<string> {
    const credential = await this.getActiveCredential("openai");
    if (!credential || credential.provider !== "openai") {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    try {
      const client = (await this.getOrCreateClient("openai", credential.apiKey)) as OpenAI;
      const audioStream = Readable.from(audioBuffer);

      const response = await client.audio.transcriptions.create({
        file: audioStream as never,
        model: "whisper-1",
      });

      await this.logAiUsage({
        provider: "openai",
        model: "whisper-1",
        totalTokens: 0,
        endpoint: "audio.transcriptions.create",
        statusCode: 200,
      });

      return response.text;
    } catch (error) {
      logger.error({ error }, "Error transcribing audio with Whisper");
      throw new Error(
        error instanceof Error ? `TRANSCRIPTION_FAILED: ${error.message}` : "TRANSCRIPTION_FAILED"
      );
    }
  }

  async logAiUsage(usage: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
    endpoint?: string;
    statusCode?: number;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.tenantDb || !this.organizationId) {
      return;
    }

    try {
      await this.tenantDb.insert(aiUsageLogs).values({
        organizationId: this.organizationId,
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
        estimatedCostUsd: usage.estimatedCostUsd?.toString() || "0",
        endpoint: usage.endpoint,
        statusCode: usage.statusCode,
        errorMessage: usage.errorMessage,
      });
    } catch (error) {
      logger.warn({ organizationId: this.organizationId, error }, "Error logging AI usage");
    }
  }

  private getModelForProvider(provider: string): string {
    const models: Record<string, string> = {
      anthropic: "claude-haiku-4-5-20251001",
      openai: "gpt-4o-mini",
      gemini: "gemini-pro",
      openrouter: "openrouter-default",
    };
    return models[provider] || provider;
  }
}
