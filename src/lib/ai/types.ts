export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIGenerateResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: string;
  generateText(prompt: string, options?: AIGenerateOptions): Promise<AIGenerateResult>;
  generateChat(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult>;
  generateJSON<T>(prompt: string, options?: AIGenerateOptions): Promise<T>;
}

export type AIProviderType = "openai" | "anthropic";
