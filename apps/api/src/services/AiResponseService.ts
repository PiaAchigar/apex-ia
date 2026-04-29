import { Readable } from "stream";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger.js";

export class AiResponseService {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor() {
    const openaiApiKey = process.env["OPENAI_API_KEY"];
    const anthropicApiKey = process.env["ANTHROPIC_API_KEY"];

    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
    }

    if (anthropicApiKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicApiKey });
    }
  }

  async transcribeAudioMessage(audioBuffer: Buffer, _mimeType: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    try {
      const audioStream = Readable.from(audioBuffer);

      const response = await this.openaiClient.audio.transcriptions.create({
        file: audioStream as never,
        model: "whisper-1",
      });

      return response.text;
    } catch (error) {
      logger.error({ error }, "Error transcribing audio with Whisper");
      throw new Error(
        error instanceof Error ? `TRANSCRIPTION_FAILED: ${error.message}` : "TRANSCRIPTION_FAILED"
      );
    }
  }

  async generateAiResponse(
    systemPrompt: string,
    userMessage: string,
    provider: "anthropic" | "openai" | "gemini" = "anthropic"
  ): Promise<string> {
    if (provider === "anthropic") {
      return this.generateWithAnthropic(systemPrompt, userMessage);
    } else if (provider === "openai") {
      return this.generateWithOpenAI(systemPrompt, userMessage);
    } else if (provider === "gemini") {
      throw new Error("GEMINI_NOT_YET_IMPLEMENTED");
    } else {
      throw new Error("AI_PROVIDER_NOT_SUPPORTED");
    }
  }

  private async generateWithAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED: ANTHROPIC_API_KEY not set");
    }

    try {
      const response = await this.anthropicClient.messages.create({
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

  private async generateWithOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED: OPENAI_API_KEY not set");
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
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
}
