import OpenAI from "openai";
import type { AIProvider, AIMessage, AIGenerateOptions, AIGenerateResult } from "./types";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<AIGenerateResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    const content = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    return {
      content,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  }

  async generateChat(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    const content = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    return {
      content,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
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
