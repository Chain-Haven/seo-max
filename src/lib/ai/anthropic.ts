import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIMessage, AIGenerateOptions, AIGenerateResult } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<AIGenerateResult> {
    const response = await this.client.messages.create({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 4096,
      system: options?.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async generateChat(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 4096,
      system: systemMessage?.content || options?.systemPrompt,
      messages: chatMessages,
    });

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async generateJSON<T>(prompt: string, options?: AIGenerateOptions): Promise<T> {
    const systemPrompt = `${options?.systemPrompt || ""}\n\nRespond with valid JSON only. No markdown, no explanation, just the JSON object.`;

    const result = await this.generateText(prompt, {
      ...options,
      systemPrompt: systemPrompt.trim(),
    });

    try {
      // Clean the response - remove markdown code blocks if present
      let jsonString = result.content.trim();
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.slice(7);
      }
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith("```")) {
        jsonString = jsonString.slice(0, -3);
      }

      return JSON.parse(jsonString.trim()) as T;
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${result.content}`);
    }
  }
}
