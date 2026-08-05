import type { Message } from './message.js';

export interface Session {
  readonly id: string;
  readonly createdAt: number;
  readonly providerId: string;
  messages: Message[];
  permissions: Map<string, boolean>;
  metadata: Record<string, unknown>;
}

export interface SessionManager {
  create(providerId: string): Session;
  get(id: string): Session | undefined;
  list(): Session[];
  close(id: string): void;
  addMessage(sessionId: string, message: Message): void;
  getMessages(sessionId: string): Message[];
  grantPermission(sessionId: string, toolName: string): void;
  hasPermission(sessionId: string, toolName: string): boolean;
}
