import type { Message } from '@bab/protocol';
import { estimateMessageTokens, DEFAULT_CONTEXT_LIMIT } from './tokenizer.js';

export interface SessionConfig {
  id: string;
  providerId: string;
  model?: string;
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Session - represents a conversation with an AI provider
 */
export class Session {
  readonly id: string;
  readonly providerId: string;
  readonly createdAt: number;
  readonly model?: string;

  private messages: Message[] = [];
  private metadata: Record<string, unknown>;
  private _updatedAt: number;

  constructor(config: SessionConfig) {
    this.id = config.id;
    this.providerId = config.providerId;
    this.model = config.model;
    this.createdAt = config.createdAt ?? Date.now();
    this._updatedAt = Date.now();
    this.metadata = config.metadata ?? {};
  }

  get updatedAt(): number {
    return this._updatedAt;
  }

  get messageCount(): number {
    return this.messages.length;
  }

  /** Rough token estimate of the whole conversation history. */
  estimateTokens(): number {
    return estimateMessageTokens(this.messages);
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    this._updatedAt = Date.now();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  clearMessages(): void {
    this.messages = [];
    this._updatedAt = Date.now();
  }

  getMetadata<T>(key: string): T | undefined {
    return this.metadata[key] as T;
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
    this._updatedAt = Date.now();
  }

  toJSON(includeMessages = false): object {
    return {
      id: this.id,
      providerId: this.providerId,
      model: this.model,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      messageCount: this.messageCount,
      estimatedTokens: this.estimateTokens(),
      contextLimit: DEFAULT_CONTEXT_LIMIT,
      contextUsagePercent: Math.min(
        100,
        Math.round((this.estimateTokens() / DEFAULT_CONTEXT_LIMIT) * 100)
      ),
      metadata: this.metadata,
      ...(includeMessages ? { messages: this.getMessages() } : {}),
    };
  }

  /**
   * Render the conversation as markdown for export.
   */
  toMarkdown(): string {
    const lines: string[] = [
      `# Session ${this.id}`,
      '',
      `- Provider: ${this.providerId}`,
      `- Model: ${this.model ?? 'n/a'}`,
      `- Created: ${new Date(this.createdAt).toISOString()}`,
      `- Updated: ${new Date(this._updatedAt).toISOString()}`,
      '',
    ];

    for (const message of this.messages) {
      const role = message.role === 'assistant' ? '🤖 Assistant' : message.role === 'system' ? '⚙️ System' : '👤 User';
      lines.push(`## ${role}`);
      lines.push('');
      lines.push(message.content ?? '');
      lines.push('');

      if (message.tool_calls && message.tool_calls.length > 0) {
        lines.push('**Tool calls:**');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(message.tool_calls, null, 2));
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
