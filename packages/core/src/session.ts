import type { Message } from '@bab/protocol';

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

  toJSON(): object {
    return {
      id: this.id,
      providerId: this.providerId,
      model: this.model,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      messageCount: this.messageCount,
      metadata: this.metadata,
    };
  }
}
