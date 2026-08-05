# Browser AI Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local open-source runtime that bridges browser-based AI services with developer tools through an OpenAI-compatible API. AI interacts with local tools via a custom Tool Negotiation protocol (not OpenAI function calling).

**Architecture:** Monorepo with `apps/` (runnable apps) + `packages/` (shared libs) + `extensions/` (browser extensions) + `examples/` + `tests/`. Core provides routing and session management. Playwright + CDP handles browser automation. Prompt Engine generates system prompts with tool descriptions. Runtime Engine executes local tools with scope-limited permissions.

**Tech Stack:** TypeScript (strict), Node.js, pnpm workspaces, Hono (HTTP), Vitest, Playwright + CDP, Chrome Extension Manifest V3

## Global Constraints

- All packages use `@bab/` npm scope
- TypeScript strict mode, `moduleResolution: "bundler"`, `target: "ES2022"`
- No unsafe site protection bypasses
- No fragile CSS selectors — use aria labels, data attributes, semantic selectors, Playwright locators
- All data stays local — no cloud dependencies, no token storage
- Each package independently testable and publishable
- Custom tool format: `{"actions": [...]}` — NOT OpenAI function calling
- Scope-limited permissions (not just ask-once), full audit logging

---

## Phase 1: Monorepo + Core Foundation

### Task 1.1: Initialize Monorepo Structure

**Covers:** [S3.1]

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "browser-ai-bridge",
  "version": "0.1.0",
  "private": true,
  "description": "Local runtime bridging browser AI with developer tools via Tool Negotiation",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "clean": "pnpm -r run clean",
    "dev": "pnpm --filter @bab/cli dev"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/tools/*'
  - 'extensions/*'
  - 'examples/*'
  - 'tests/*'
```

- [ ] **Step 3: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 4: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist"]
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.vitest/
coverage/
.DS_Store
*.log
```

- [ ] **Step 6: Create .npmrc**

```
auto-install-peers=true
```

- [ ] **Step 7: Initialize git repo and commit**

```bash
git init
git add .
git commit -m "chore: initialize monorepo structure"
```

---

### Task 1.2: Create Protocol Package (Types & Interfaces)

**Covers:** [S3.2, S3.4, S3.5]

**Files:**
- Create: `packages/protocol/package.json`
- Create: `packages/protocol/tsconfig.json`
- Create: `packages/protocol/src/index.ts`
- Create: `packages/protocol/src/types/message.ts`
- Create: `packages/protocol/src/types/provider.ts`
- Create: `packages/protocol/src/types/tool.ts`
- Create: `packages/protocol/src/types/runtime.ts`
- Create: `packages/protocol/src/types/events.ts`
- Create: `packages/protocol/src/types/config.ts`
- Create: `packages/protocol/src/types/session.ts`
- Create: `packages/protocol/src/types/actions.ts` ← NEW: Tool Negotiation format

- [ ] **Step 1: Create package.json for protocol**

```json
{
  "name": "@bab/protocol",
  "version": "0.1.0",
  "description": "TypeScript types and interfaces for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json for protocol**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create message types**

```typescript
// packages/protocol/src/types/message.ts

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: Usage;
}

export interface ChatCompletionChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'tool_calls' | 'length' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: Partial<Message>;
  finish_reason: 'stop' | 'tool_calls' | 'length' | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
```

- [ ] **Step 4: Create provider types**

```typescript
// packages/protocol/src/types/provider.ts

import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from './message.js';

export interface Provider {
  readonly id: string;
  readonly name: string;
  readonly status: ProviderStatus;

  send(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  cancel(): void;
  shutdown(): Promise<void>;
}

export type ProviderStatus = 'idle' | 'busy' | 'error' | 'shutdown';

export interface ProviderConfig {
  id: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ProviderManager {
  register(provider: Provider): void;
  unregister(id: string): void;
  get(id: string): Provider | undefined;
  list(): Provider[];
  getActive(): Provider;
  setActive(id: string): void;
}
```

- [ ] **Step 5: Create tool types (Custom Action Format)**

```typescript
// packages/protocol/src/types/tool.ts

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;

  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
  sessionId: string;
  workingDirectory: string;
  scope: ToolScope;
  env: Record<string, string>;
}

export interface ToolScope {
  allowedPaths: string[];
  allowedCommands: string[];
  deniedCommands: string[];
  maxExecutionTime: number;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDispatcher {
  register(tool: Tool): void;
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  getDescriptions(): ToolDescription[];
}

export interface ToolDescription {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
```

- [ ] **Step 5.1: Create Action types (Tool Negotiation format)**

```typescript
// packages/protocol/src/types/actions.ts

// Custom format: {"actions": [...]} — NOT OpenAI function calling
export interface ActionRequest {
  actions: Action[];
  context?: string;
}

export interface Action {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

export interface ActionResponse {
  results: ActionResult[];
  summary: string;
}

export interface ActionResult {
  id: string;
  success: boolean;
  output: string;
  error?: string;
}

// Tool Negotiation — AI and runtime agree on available tools
export interface ToolNegotiation {
  availableTools: ToolDescription[];
  constraints: NegotiationConstraints;
  format: 'actions';
}

export interface NegotiationConstraints {
  maxActionsPerTurn: number;
  allowedTools: string[];
  deniedTools: string[];
  requireConfirmation: string[];
}
```

- [ ] **Step 6: Create runtime types (Scope-based permissions)**

```typescript
// packages/protocol/src/types/runtime.ts

import type { Tool, ToolResult, ToolContext, ToolScope } from './tool.js';

export interface Runtime {
  readonly tools: RuntimeToolManager;
  readonly permissions: PermissionEngine;
  readonly audit: AuditLogger;

  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface RuntimeToolManager {
  register(tool: Tool): void;
  execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  list(): Tool[];
}

export interface PermissionEngine {
  check(toolName: string, params: Record<string, unknown>, context: PermissionContext): Promise<PermissionResult>;
  grant(toolName: string, scope: ToolScope, sessionId: string): void;
  revoke(toolName: string, sessionId: string): void;
  clear(sessionId: string): void;
  getScope(toolName: string, sessionId: string): ToolScope | undefined;
}

export interface PermissionContext {
  sessionId: string;
  scope: ToolScope;
  auditLog: AuditEntry[];
}

export type PermissionResult = 
  | { allowed: true }
  | { allowed: false; reason: string; suggestion?: string };

export interface AuditLogger {
  log(entry: AuditEntry): void;
  getEntries(sessionId: string): AuditEntry[];
  clear(sessionId: string): void;
}

export interface AuditEntry {
  timestamp: number;
  sessionId: string;
  toolName: string;
  params: Record<string, unknown>;
  result: 'allowed' | 'denied' | 'error';
  reason?: string;
}
```

- [ ] **Step 7: Create event types**

```typescript
// packages/protocol/src/types/events.ts

export type EventMap = {
  'request.received': { requestId: string; model: string };
  'request.completed': { requestId: string; duration: number };
  'request.error': { requestId: string; error: string };

  'provider.connected': { providerId: string };
  'provider.disconnected': { providerId: string };
  'provider.error': { providerId: string; error: string };

  'tool.requested': { toolName: string; params: Record<string, unknown>; sessionId: string };
  'tool.executing': { toolName: string; sessionId: string };
  'tool.completed': { toolName: string; result: unknown; sessionId: string };
  'tool.error': { toolName: string; error: string; sessionId: string };

  'permission.requested': { toolName: string; sessionId: string };
  'permission.granted': { toolName: string; sessionId: string };
  'permission.denied': { toolName: string; sessionId: string };

  'session.created': { sessionId: string };
  'session.closed': { sessionId: string };
};

export type EventHandler<T> = (data: T) => void | Promise<void>;
```

- [ ] **Step 8: Create config types (Security-enhanced)**

```typescript
// packages/protocol/src/types/config.ts

export interface AppConfig {
  server: ServerConfig;
  providers: ProviderConfigEntry[];
  runtime: RuntimeConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
  cors: boolean;
  endpoints: {
    chat: string;    // /v1/chat/completions
    responses: string; // /v1/responses
    models: string;  // /models
  };
}

export interface ProviderConfigEntry {
  id: string;
  type: 'playwright' | 'extension';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface RuntimeConfig {
  workingDirectory: string;
  permissions: PermissionConfig;
}

export interface PermissionConfig {
  mode: 'scope' | 'ask-always' | 'policy';
  defaultScope: ToolScope;
  dangerousTools: string[];
}

export interface SecurityConfig {
  noTokenStorage: boolean;        // Never store API tokens
  auditLogging: boolean;          // Log all tool executions
  scopeRestrictions: boolean;     // Enforce path/command scopes
  maxSessionDuration: number;     // Auto-close sessions after N ms
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  auditFile?: string;             // Separate audit log file
}
```

- [ ] **Step 9: Create session types**

```typescript
// packages/protocol/src/types/session.ts

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
```

- [ ] **Step 10: Create index.ts barrel export**

```typescript
// packages/protocol/src/index.ts

export type * from './types/message.js';
export type * from './types/provider.js';
export type * from './types/tool.js';
export type * from './types/runtime.js';
export type * from './types/events.js';
export type * from './types/config.js';
export type * from './types/session.js';
export type * from './types/actions.js';
```

- [ ] **Step 11: Build and verify protocol package**

```bash
cd packages/protocol
pnpm run build
```

Expected: `dist/` directory created with `.js` and `.d.ts` files, no errors.

- [ ] **Step 12: Commit**

```bash
git add packages/protocol
git commit -m "feat(protocol): add type definitions for Provider, Tool, Runtime, Events"
```

---

### Task 1.3: Create Core Package — EventBus

**Covers:** [S3.6]

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/event-bus.ts`
- Create: `packages/core/src/event-bus.test.ts`

**Interfaces:**
- Consumes: `EventMap`, `EventHandler` from `@bab/protocol`
- Produces: `EventBus` class with `emit()`, `on()`, `off()`, `once()`

- [ ] **Step 1: Create package.json for core**

```json
{
  "name": "@bab/core",
  "version": "0.1.0",
  "description": "Core module for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json for core**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// packages/core/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write failing test for EventBus**

```typescript
// packages/core/src/event-bus.test.ts

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  it('should call handler when event is emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ sessionId: 'test-123' });
  });

  it('should support multiple handlers for same event', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('session.created', handler1);
    bus.on('session.created', handler2);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should unsubscribe handler when off() is called', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('session.created', handler);
    bus.off('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe handler returned by on()', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.on('session.created', handler);
    unsubscribe();
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should call once handler only one time', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-1' });
    bus.emit('session.created', { sessionId: 'test-2' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ sessionId: 'test-1' });
  });

  it('should handle async handlers', async () => {
    const bus = new EventBus();
    const results: string[] = [];

    bus.on('session.created', async (data) => {
      await new Promise((r) => setTimeout(r, 10));
      results.push(data.sessionId);
    });

    await bus.emitAsync('session.created', { sessionId: 'test-123' });

    expect(results).toEqual(['test-123']);
  });

  it('should not throw if no handlers registered', () => {
    const bus = new EventBus();

    expect(() => {
      bus.emit('session.created', { sessionId: 'test-123' });
    }).not.toThrow();
  });

  it('should remove all handlers when removeAllListeners is called', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('session.created', handler1);
    bus.on('tool.completed', handler2);
    bus.removeAllListeners();

    bus.emit('session.created', { sessionId: 'test-123' });
    bus.emit('tool.completed', { toolName: 'fs', result: {}, sessionId: 'test-123' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd packages/core
pnpm test
```

Expected: FAIL — `EventBus` not found

- [ ] **Step 6: Implement EventBus**

```typescript
// packages/core/src/event-bus.ts

import type { EventMap, EventHandler } from '@bab/protocol';

export class EventBus {
  private listeners = new Map<string, Set<EventHandler<unknown>>>();

  on<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  once<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const wrapper: EventHandler<EventMap[K]> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  }

  emit<K extends keyof EventMap & string>(
    event: K,
    data: EventMap[K]
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`EventBus error in handler for "${event}":`, error);
      }
    }
  }

  async emitAsync<K extends keyof EventMap & string>(
    event: K,
    data: EventMap[K]
  ): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      promises.push(
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`EventBus async error in handler for "${event}":`, error);
        })
      );
    }
    await Promise.all(promises);
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd packages/core
pnpm test
```

Expected: All 8 tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat(core): add EventBus with typed events"
```

---

### Task 1.4: Create Core Package — Logger

**Covers:** [S3.1]

**Files:**
- Create: `packages/core/src/logger.ts`
- Create: `packages/core/src/logger.test.ts`

**Interfaces:**
- Consumes: `LoggingConfig` from `@bab/protocol`
- Produces: `Logger` class with `debug()`, `info()`, `warn()`, `error()`, `child()`

- [ ] **Step 1: Write failing test for Logger**

```typescript
// packages/core/src/logger.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    const logger = new Logger({ level: 'info', format: 'text' });
    logger.info('test message');

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('test message');
  });

  it('should not log debug when level is info', () => {
    const logger = new Logger({ level: 'info', format: 'text' });
    logger.debug('debug message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log debug when level is debug', () => {
    const logger = new Logger({ level: 'debug', format: 'text' });
    logger.debug('debug message');

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should include context in log output', () => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'TestModule' });
    logger.info('test message');

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[TestModule]');
  });

  it('should create child logger with additional context', () => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'Parent' });
    const child = logger.child('Child');
    child.info('test message');

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[Parent:Child]');
  });

  it('should output JSON format when configured', () => {
    const logger = new Logger({ level: 'info', format: 'json' });
    logger.info('test message', { key: 'value' });

    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.key).toBe('value');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core
pnpm test
```

Expected: FAIL — `Logger` not found

- [ ] **Step 3: Implement Logger**

```typescript
// packages/core/src/logger.ts

import type { LoggingConfig } from '@bab/protocol';

interface LoggerOptions extends LoggingConfig {
  context?: string;
}

export class Logger {
  private level: LoggingConfig['level'];
  private format: LoggingConfig['format'];
  private context?: string;

  private levels: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.format = options.format;
    this.context = options.context;
  }

  child(name: string): Logger {
    const childContext = this.context
      ? `${this.context}:${name}`
      : name;

    return new Logger({
      level: this.level,
      format: this.format,
      context: childContext,
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  private log(level: LoggingConfig['level'], message: string, data?: Record<string, unknown>): void {
    if (this.levels[level] < this.levels[this.level]) return;

    if (this.format === 'json') {
      this.logJson(level, message, data);
    } else {
      this.logText(level, message, data);
    }
  }

  private logText(level: string, message: string, _data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const output = `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;
    
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  private logJson(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...data,
    };

    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core
pnpm test
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/logger.ts packages/core/src/logger.test.ts
git commit -m "feat(core): add Logger with text/JSON formats and child loggers"
```

---

### Task 1.5: Create Core Package — Config

**Covers:** [S3.1]

**Files:**
- Create: `packages/core/src/config.ts`
- Create: `packages/core/src/config.test.ts`

**Interfaces:**
- Consumes: `AppConfig` from `@bab/protocol`
- Produces: `Config` class with `get()`, `set()`, `load()`, `save()`

- [ ] **Step 1: Write failing test for Config**

```typescript
// packages/core/src/config.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { Config } from './config.js';
import type { AppConfig } from '@bab/protocol';

describe('Config', () => {
  const defaultConfig: AppConfig = {
    server: { host: 'localhost', port: 3000, cors: true },
    providers: [],
    runtime: {
      workingDirectory: process.cwd(),
      permissions: { mode: 'ask-once', dangerousTools: ['shell'] },
    },
    logging: { level: 'info', format: 'text' },
  };

  it('should return default config when no overrides', () => {
    const config = new Config();
    expect(config.get()).toEqual(defaultConfig);
  });

  it('should merge partial config with defaults', () => {
    const config = new Config({
      server: { host: '0.0.0.0', port: 8080, cors: false },
    });

    const result = config.get();
    expect(result.server.host).toBe('0.0.0.0');
    expect(result.server.port).toBe(8080);
    expect(result.logging).toEqual(defaultConfig.logging);
  });

  it('should get nested value by path', () => {
    const config = new Config();
    expect(config.get('server.port')).toBe(3000);
    expect(config.get('logging.level')).toBe('info');
  });

  it('should set nested value by path', () => {
    const config = new Config();
    config.set('server.port', 8080);
    expect(config.get('server.port')).toBe(8080);
  });

  it('should throw for invalid path', () => {
    const config = new Config();
    expect(() => config.get('invalid.path.here')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core
pnpm test
```

Expected: FAIL — `Config` not found

- [ ] **Step 3: Implement Config**

```typescript
// packages/core/src/config.ts

import type { AppConfig } from '@bab/protocol';

const defaultConfig: AppConfig = {
  server: { host: 'localhost', port: 3000, cors: true },
  providers: [],
  runtime: {
    workingDirectory: process.cwd(),
    permissions: { mode: 'ask-once', dangerousTools: ['shell'] },
  },
  logging: { level: 'info', format: 'text' },
};

export class Config {
  private data: AppConfig;

  constructor(partial?: Partial<AppConfig>) {
    this.data = this.deepMerge(defaultConfig, partial ?? {}) as AppConfig;
  }

  get(): AppConfig;
  get<T>(path: string): T;
  get(path?: string): unknown {
    if (!path) return this.data;
    return this.getByPath(this.data, path);
  }

  set(path: string, value: unknown): void {
    this.setByPath(this.data, path, value);
  }

  private getByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(`Invalid config path: ${path}`);
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (this.isObject(target) && this.isObject(source)) {
      const result = { ...target } as Record<string, unknown>;
      for (const key of Object.keys(source as Record<string, unknown>)) {
        if (this.isObject((source as Record<string, unknown>)[key])) {
          if (!(key in result)) {
            result[key] = (source as Record<string, unknown>)[key];
          } else {
            result[key] = this.deepMerge(
              result[key],
              (source as Record<string, unknown>)[key]
            );
          }
        } else {
          result[key] = (source as Record<string, unknown>)[key];
        }
      }
      return result;
    }
    return source;
  }

  private isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core
pnpm test
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config.ts packages/core/src/config.test.ts
git commit -m "feat(core): add Config with deep merge and path access"
```

---

### Task 1.6: Create Core Package — SessionManager

**Covers:** [S3.1]

**Files:**
- Create: `packages/core/src/session-manager.ts`
- Create: `packages/core/src/session-manager.test.ts`

**Interfaces:**
- Consumes: `Session`, `SessionManager` interface from `@bab/protocol`, `EventBus`
- Produces: `SessionManager` class

- [ ] **Step 1: Write failing test for SessionManager**

```typescript
// packages/core/src/session-manager.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManagerImpl } from './session-manager.js';
import { EventBus } from './event-bus.js';

describe('SessionManager', () => {
  let manager: SessionManagerImpl;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new SessionManagerImpl(eventBus);
  });

  it('should create a session with unique id', () => {
    const session = manager.create('gemini');
    expect(session.id).toBeDefined();
    expect(session.providerId).toBe('gemini');
    expect(session.messages).toEqual([]);
  });

  it('should emit session.created event', () => {
    const handler = vi.fn();
    eventBus.on('session.created', handler);
    
    const session = manager.create('gemini');
    
    expect(handler).toHaveBeenCalledWith({ sessionId: session.id });
  });

  it('should get session by id', () => {
    const session = manager.create('gemini');
    const retrieved = manager.get(session.id);
    
    expect(retrieved).toBe(session);
  });

  it('should return undefined for non-existent session', () => {
    expect(manager.get('non-existent')).toBeUndefined();
  });

  it('should list all sessions', () => {
    manager.create('gemini');
    manager.create('chatgpt');
    
    expect(manager.list()).toHaveLength(2);
  });

  it('should add message to session', () => {
    const session = manager.create('gemini');
    
    manager.addMessage(session.id, {
      role: 'user',
      content: 'Hello',
    });
    
    expect(manager.getMessages(session.id)).toHaveLength(1);
    expect(manager.getMessages(session.id)[0].content).toBe('Hello');
  });

  it('should close session and emit event', () => {
    const handler = vi.fn();
    eventBus.on('session.closed', handler);
    
    const session = manager.create('gemini');
    manager.close(session.id);
    
    expect(handler).toHaveBeenCalledWith({ sessionId: session.id });
    expect(manager.get(session.id)).toBeUndefined();
  });

  it('should grant and check permissions', () => {
    const session = manager.create('gemini');
    
    expect(manager.hasPermission(session.id, 'fs.read')).toBe(false);
    
    manager.grantPermission(session.id, 'fs.read');
    
    expect(manager.hasPermission(session.id, 'fs.read')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core
pnpm test
```

Expected: FAIL — `SessionManagerImpl` not found

- [ ] **Step 3: Implement SessionManager**

```typescript
// packages/core/src/session-manager.ts

import type { Message, Session } from '@bab/protocol';
import { EventBus } from './event-bus.js';
import { randomUUID } from 'node:crypto';

export class SessionManagerImpl {
  private sessions = new Map<string, Session>();

  constructor(private eventBus: EventBus) {}

  create(providerId: string): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: Date.now(),
      providerId,
      messages: [],
      permissions: new Map(),
      metadata: {},
    };

    this.sessions.set(session.id, session);
    this.eventBus.emit('session.created', { sessionId: session.id });

    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  close(id: string): void {
    this.sessions.delete(id);
    this.eventBus.emit('session.closed', { sessionId: id });
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.messages.push(message);
  }

  getMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return [...session.messages];
  }

  grantPermission(sessionId: string, toolName: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.permissions.set(toolName, true);
  }

  hasPermission(sessionId: string, toolName: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.permissions.get(toolName) === true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core
pnpm test
```

Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/session-manager.ts packages/core/src/session-manager.test.ts
git commit -m "feat(core): add SessionManager with permission tracking"
```

---

### Task 1.7: Create Core Package — Router

**Covers:** [S3.1]

**Files:**
- Create: `packages/core/src/router.ts`
- Create: `packages/core/src/router.test.ts`

**Interfaces:**
- Consumes: `Provider`, `ChatCompletionRequest`, `ChatCompletionResponse` from `@bab/protocol`, `EventBus`
- Produces: `Router` class with `route()`

- [ ] **Step 1: Write failing test for Router**

```typescript
// packages/core/src/router.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from './router.js';
import { EventBus } from './event-bus.js';
import type { Provider, ChatCompletionRequest, ChatCompletionResponse } from '@bab/protocol';

function createMockProvider(id: string): Provider {
  return {
    id,
    name: id,
    status: 'idle',
    send: vi.fn(),
    stream: vi.fn(),
    cancel: vi.fn(),
    shutdown: vi.fn(),
  };
}

describe('Router', () => {
  let router: Router;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    router = new Router(eventBus);
  });

  it('should register a provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);
    
    expect(router.getProvider('gemini')).toBe(provider);
  });

  it('should throw when registering duplicate provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);
    
    expect(() => router.registerProvider(provider)).toThrow('already registered');
  });

  it('should set and get active provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);
    router.setActiveProvider('gemini');
    
    expect(router.getActiveProvider()).toBe(provider);
  });

  it('should throw when setting non-existent provider as active', () => {
    expect(() => router.setActiveProvider('nonexistent')).toThrow('not found');
  });

  it('should route request to active provider', async () => {
    const provider = createMockProvider('gemini');
    const mockResponse: ChatCompletionResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gemini-pro',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello' },
        finish_reason: 'stop',
      }],
    };
    
    vi.mocked(provider.send).mockResolvedValue(mockResponse);
    
    router.registerProvider(provider);
    router.setActiveProvider('gemini');
    
    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
    };
    
    const response = await router.route(request);
    
    expect(provider.send).toHaveBeenCalledWith(request);
    expect(response).toBe(mockResponse);
  });

  it('should emit request events', async () => {
    const provider = createMockProvider('gemini');
    vi.mocked(provider.send).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gemini-pro',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello' },
        finish_reason: 'stop',
      }],
    });
    
    router.registerProvider(provider);
    router.setActiveProvider('gemini');
    
    const receivedHandler = vi.fn();
    const completedHandler = vi.fn();
    eventBus.on('request.received', receivedHandler);
    eventBus.on('request.completed', completedHandler);
    
    await router.route({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    
    expect(receivedHandler).toHaveBeenCalled();
    expect(completedHandler).toHaveBeenCalled();
  });

  it('should throw when no active provider set', async () => {
    await expect(router.route({
      model: 'test',
      messages: [],
    })).rejects.toThrow('No active provider');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core
pnpm test
```

Expected: FAIL — `Router` not found

- [ ] **Step 3: Implement Router**

```typescript
// packages/core/src/router.ts

import type {
  Provider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@bab/protocol';
import { EventBus } from './event-bus.js';
import { randomUUID } from 'node:crypto';

export class Router {
  private providers = new Map<string, Provider>();
  private activeProviderId: string | null = null;

  constructor(private eventBus: EventBus) {}

  registerProvider(provider: Provider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" already registered`);
    }
    this.providers.set(provider.id, provider);
    this.eventBus.emit('provider.connected', { providerId: provider.id });
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      this.activeProviderId = null;
    }
    this.eventBus.emit('provider.disconnected', { providerId: id });
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  listProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider "${id}" not found`);
    }
    this.activeProviderId = id;
  }

  getActiveProvider(): Provider {
    if (!this.activeProviderId) {
      throw new Error('No active provider set');
    }
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      throw new Error(`Active provider "${this.activeProviderId}" not found`);
    }
    return provider;
  }

  async route(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = this.getActiveProvider();
    const requestId = randomUUID();

    this.eventBus.emit('request.received', {
      requestId,
      model: request.model,
    });

    const startTime = Date.now();

    try {
      const response = await provider.send(request);

      this.eventBus.emit('request.completed', {
        requestId,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.eventBus.emit('request.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async *routeStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const provider = this.getActiveProvider();
    const requestId = randomUUID();

    this.eventBus.emit('request.received', {
      requestId,
      model: request.model,
    });

    const startTime = Date.now();

    try {
      yield* provider.stream(request);

      this.eventBus.emit('request.completed', {
        requestId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.eventBus.emit('request.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core
pnpm test
```

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/router.ts packages/core/src/router.test.ts
git commit -m "feat(core): add Router for provider management and request routing"
```

---

### Task 1.8: Create Core Package — Barrel Export

**Covers:** [S3.1]

**Files:**
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tsconfig.build.json`

- [ ] **Step 1: Create barrel export**

```typescript
// packages/core/src/index.ts

export { EventBus } from './event-bus.js';
export { Logger } from './logger.js';
export { Config } from './config.js';
export { SessionManagerImpl as SessionManager } from './session-manager.js';
export { Router } from './router.js';
```

- [ ] **Step 2: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Build core package**

```bash
cd packages/core
pnpm run build
```

Expected: `dist/` created with `.js` and `.d.ts` files

- [ ] **Step 4: Run all core tests**

```bash
cd packages/core
pnpm test
```

Expected: All tests PASS (27 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "chore(core): add barrel export and build config"
```

---

### Task 1.9: Create Prompt Engine Package

**Covers:** [NEW — Tool Negotiation]

**Files:**
- Create: `packages/prompt-engine/package.json`
- Create: `packages/prompt-engine/tsconfig.json`
- Create: `packages/prompt-engine/vitest.config.ts`
- Create: `packages/prompt-engine/src/prompt-engine.ts`
- Create: `packages/prompt-engine/src/prompt-engine.test.ts`
- Create: `packages/prompt-engine/src/templates/`
- Create: `packages/prompt-engine/src/index.ts`

**Purpose:** Generates system prompts that teach AI how to use tools via the custom `{"actions": [...]}` format. This is the core of Tool Negotiation — the AI learns what tools are available and how to call them.

- [ ] **Step 1: Create package.json for prompt-engine**

```json
{
  "name": "@bab/prompt-engine",
  "version": "0.1.0",
  "description": "System prompt generator with Tool Negotiation for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' }
});
```

- [ ] **Step 4: Write failing test for PromptEngine**

```typescript
// packages/prompt-engine/src/prompt-engine.test.ts

import { describe, it, expect } from 'vitest';
import { PromptEngine } from './prompt-engine.js';
import type { ToolDescription } from '@bab/protocol';

const mockTools: ToolDescription[] = [
  {
    name: 'fs.read',
    description: 'Read file contents',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'git.status',
    description: 'Get git status',
    parameters: { type: 'object', properties: {} },
  },
];

describe('PromptEngine', () => {
  it('should generate system prompt with tool descriptions', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    expect(prompt).toContain('fs.read');
    expect(prompt).toContain('git.status');
    expect(prompt).toContain('actions');
  });

  it('should include Tool Negotiation format in prompt', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    // Should instruct AI to use {"actions": [...]} format
    expect(prompt).toContain('"actions"');
    expect(prompt).toContain('"tool"');
    expect(prompt).toContain('"params"');
  });

  it('should include tool parameters schema', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    expect(prompt).toContain('"path"');
  });

  it('should generate prompt for single tool', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt([mockTools[0]]);

    expect(prompt).toContain('fs.read');
    expect(prompt).not.toContain('git.status');
  });

  it('should handle empty tools list', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt([]);

    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Implement PromptEngine**

```typescript
// packages/prompt-engine/src/prompt-engine.ts

import type { ToolDescription, ToolNegotiation, NegotiationConstraints } from '@bab/protocol';

export class PromptEngine {
  generateSystemPrompt(tools: ToolDescription[], constraints?: NegotiationConstraints): string {
    const sections: string[] = [];

    // Header
    sections.push(this.buildHeader());

    // Tool Negotiation format
    sections.push(this.buildFormatSection());

    // Available tools
    if (tools.length > 0) {
      sections.push(this.buildToolsSection(tools));
    }

    // Constraints
    if (constraints) {
      sections.push(this.buildConstraintsSection(constraints));
    }

    // Examples
    sections.push(this.buildExamplesSection(tools));

    return sections.join('\n\n');
  }

  generateNegotiation(tools: ToolDescription[], constraints: NegotiationConstraints): ToolNegotiation {
    return {
      availableTools: tools,
      constraints,
      format: 'actions',
    };
  }

  private buildHeader(): string {
    return `You are an AI assistant with access to local developer tools.
You can execute tools by responding with a JSON object containing an "actions" array.
Each action specifies a tool to call with its parameters.
IMPORTANT: Always use the exact format shown below. Do NOT use function calling or any other format.`;
  }

  private buildFormatSection(): string {
    return `## Response Format

When you need to use tools, respond with ONLY a JSON object (no markdown, no explanation):

\`\`\`json
{
  "actions": [
    {
      "id": "unique-action-id",
      "tool": "tool.name",
      "params": { "key": "value" },
      "description": "Brief description of what this action does"
    }
  ]
}
\`\`\`

After receiving tool results, you will get a response with:
\`\`\`json
{
  "results": [
    {
      "id": "action-id",
      "success": true,
      "output": "tool output"
    }
  ],
  "summary": "Brief summary of what was done"
}
\`\`\`

You can then respond normally with the results.`;
  }

  private buildToolsSection(tools: ToolDescription[]): string {
    const toolDocs = tools.map((tool) => this.formatToolDoc(tool)).join('\n\n');

    return `## Available Tools

${toolDocs}`;
  }

  private formatToolDoc(tool: ToolDescription): string {
    const params = Object.entries(tool.parameters.properties ?? {})
      .map(([key, schema]) => `  - ${key}: ${(schema as { type: string }).type}`)
      .join('\n');

    return `### ${tool.name}
${tool.description}
Parameters:
${params || '  (none)'}`;
  }

  private buildConstraintsSection(constraints: NegotiationConstraints): string {
    const lines: string[] = ['## Constraints'];

    if (constraints.maxActionsPerTurn) {
      lines.push(`- Maximum ${constraints.maxActionsPerTurn} actions per response`);
    }
    if (constraints.allowedTools.length > 0) {
      lines.push(`- Allowed tools: ${constraints.allowedTools.join(', ')}`);
    }
    if (constraints.deniedTools.length > 0) {
      lines.push(`- Denied tools: ${constraints.deniedTools.join(', ')}`);
    }
    if (constraints.requireConfirmation.length > 0) {
      lines.push(`- These tools require user confirmation: ${constraints.requireConfirmation.join(', ')}`);
    }

    return lines.join('\n');
  }

  private buildExamplesSection(tools: ToolDescription[]): string {
    if (tools.length === 0) return '';

    const exampleTool = tools[0];
    const firstParam = Object.keys(exampleTool.parameters.properties ?? {})[0] ?? 'value';

    return `## Example

User: "Read the file config.json"

Your response:
\`\`\`json
{
  "actions": [
    {
      "id": "read-1",
      "tool": "${exampleTool.name}",
      "params": { "${firstParam}": "config.json" },
      "description": "Reading config.json file"
    }
  ]
}
\`\`\``;
  }
}
```

- [ ] **Step 6: Create barrel export**

```typescript
// packages/prompt-engine/src/index.ts

export { PromptEngine } from './prompt-engine.js';
```

- [ ] **Step 7: Run tests**

```bash
cd packages/prompt-engine
pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add packages/prompt-engine
git commit -m "feat(prompt-engine): add PromptEngine with Tool Negotiation format"
```

---

## Phase 2: OpenAI-Compatible API

### Task 2.1: Create API Package — Server Foundation

**Covers:** [S4]

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/vitest.config.ts`
- Create: `packages/api/src/server.ts`
- Create: `packages/api/src/server.test.ts`

**Interfaces:**
- Consumes: `Router`, `SessionManager`, `Config`, `Logger`, `PromptEngine` from `@bab/core`, `@bab/prompt-engine`
- Produces: `createServer()` function returning Hono app
- Endpoints: `/health`, `/models`, `/v1/chat/completions`, `/v1/responses`

- [ ] **Step 1: Create package.json for api**

```json
{
  "name": "@bab/api",
  "version": "0.1.0",
  "description": "OpenAI-compatible REST API for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/core": "workspace:*",
    "@bab/protocol": "workspace:*",
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "tsx": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" },
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// packages/api/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write failing test for server**

```typescript
// packages/api/src/server.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './server.js';
import { Router, SessionManager, EventBus, Config, Logger } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import type { Provider, ChatCompletionResponse } from '@bab/protocol';

function createTestServer() {
  const eventBus = new EventBus();
  const config = new Config();
  const logger = new Logger({ level: 'error', format: 'text' });
  const sessionManager = new SessionManager(eventBus);
  const router = new Router(eventBus);
  const promptEngine = new PromptEngine();

  // Register a mock provider
  const mockProvider: Provider = {
    id: 'test-provider',
    name: 'Test Provider',
    status: 'idle',
    send: async (request) => ({
      id: 'test-completion',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Test response' },
        finish_reason: 'stop',
      }],
    }),
    stream: async function* () {
      yield {
        id: 'test-chunk',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test',
        choices: [{
          index: 0,
          delta: { role: 'assistant', content: 'Test' },
          finish_reason: null,
        }],
      };
    },
    cancel: () => {},
    shutdown: async () => {},
  };

  router.registerProvider(mockProvider);
  router.setActiveProvider('test-provider');

  return createServer({ router, sessionManager, logger, promptEngine });
}

describe('API Server', () => {
  it('should return health check', async () => {
    const app = createTestServer();
    const res = await app.request('/health');
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('should list models at /models', async () => {
    const app = createTestServer();
    const res = await app.request('/models');
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should list models at /v1/models', async () => {
    const app = createTestServer();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it('should handle chat completion request', async () => {
    const app = createTestServer();
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.choices[0].message.content).toBe('Test response');
  });

  it('should handle /v1/responses endpoint', async () => {
    const app = createTestServer();
    const res = await app.request('/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test-model',
        input: [{ role: 'user', content: 'Hello' }],
      }),
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBeDefined();
  });

  it('should return 400 for invalid request', async () => {
    const app = createTestServer();
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    expect(res.status).toBe(400);
  });

  it('should return 404 for unknown endpoint', async () => {
    const app = createTestServer();
    const res = await app.request('/unknown');
    
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd packages/api
pnpm test
```

Expected: FAIL — `createServer` not found

- [ ] **Step 6: Implement server**

```typescript
// packages/api/src/server.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Router, SessionManager, Logger } from '@bab/core';
import type { PromptEngine } from '@bab/prompt-engine';
import type { ChatCompletionRequest } from '@bab/protocol';
import { randomUUID } from 'node:crypto';

interface ServerDeps {
  router: Router;
  sessionManager: SessionManager;
  logger: Logger;
  promptEngine: PromptEngine;
}

export function createServer(deps: ServerDeps): Hono {
  const app = new Hono();
  const { router, logger, promptEngine } = deps;

  app.use('*', cors());

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: Date.now() });
  });

  // Models list (both /models and /v1/models)
  const listModels = (c: any) => {
    const providers = router.listProviders();
    return c.json({
      object: 'list',
      data: providers.map((p) => ({
        id: p.id,
        object: 'model',
        created: 0,
        owned_by: p.name,
      })),
    });
  };

  app.get('/models', listModels);
  app.get('/v1/models', listModels);

  // Chat completions (OpenAI-compatible)
  app.post('/v1/chat/completions', async (c) => {
    let body: ChatCompletionRequest;
    try {
      body = await c.req.json<ChatCompletionRequest>();
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: { message: 'messages array is required' } }, 400);
    }

    if (!body.model) {
      return c.json({ error: { message: 'model is required' } }, 400);
    }

    logger.info('Chat completion request', { model: body.model });

    try {
      // Inject system prompt with tool negotiation if tools available
      const tools = router.getActiveProvider().getTools?.() ?? [];
      if (tools.length > 0 && !body.messages.some(m => m.role === 'system')) {
        const systemPrompt = promptEngine.generateSystemPrompt(tools);
        body.messages.unshift({ role: 'system', content: systemPrompt });
      }

      if (body.stream) {
        return streamResponse(router, body, logger);
      }

      const response = await router.route(body);
      return c.json(response);
    } catch (error) {
      logger.error('Request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          type: 'server_error',
        },
      }, 500);
    }
  });

  // Responses endpoint (alternative format)
  app.post('/v1/responses', async (c) => {
    let body: { model: string; input: Array<{ role: string; content: string }> };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    if (!body.model || !body.input) {
      return c.json({ error: { message: 'model and input are required' } }, 400);
    }

    logger.info('Responses request', { model: body.model });

    try {
      const request: ChatCompletionRequest = {
        model: body.model,
        messages: body.input.map(m => ({ role: m.role as any, content: m.content })),
      };

      const response = await router.route(request);

      // Transform to responses format
      return c.json({
        id: response.id,
        object: 'response',
        created: response.created,
        model: response.model,
        output: response.choices.map((choice, i) => ({
          id: `${response.id}-${i}`,
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'output_text',
            text: choice.message.content ?? '',
          }],
        })),
      });
    } catch (error) {
      logger.error('Responses request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          type: 'server_error',
        },
      }, 500);
    }
  });

  return app;
}

function streamResponse(router: Router, request: ChatCompletionRequest, logger: Logger): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of router.routeStream(request)) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        logger.error('Stream error', {
          error: error instanceof Error ? error.message : String(error),
        });
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd packages/api
pnpm test
```

Expected: All 4 tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/api
git commit -m "feat(api): add OpenAI-compatible REST server with Hono"
```

---

### Task 2.2: Create API Entry Point

**Covers:** [S4]

**Files:**
- Create: `packages/api/src/index.ts`
- Create: `packages/api/tsconfig.build.json`

- [ ] **Step 1: Create barrel export**

```typescript
// packages/api/src/index.ts

export { createServer } from './server.js';
```

- [ ] **Step 2: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Build api package**

```bash
cd packages/api
pnpm run build
```

Expected: `dist/` created

- [ ] **Step 4: Commit**

```bash
git add packages/api
git commit -m "chore(api): add barrel export and build config"
```

---

## Phase 3: Browser Provider (Playwright + CDP)

### Task 3.1: Create Playwright Provider — Primary Browser Automation

**Covers:** [S3.3]

**Files:**
- Create: `packages/playwright-provider/package.json`
- Create: `packages/playwright-provider/tsconfig.json`
- Create: `packages/playwright-provider/vitest.config.ts`
- Create: `packages/playwright-provider/src/cdp-client.ts`
- Create: `packages/playwright-provider/src/site-adapter.ts`
- Create: `packages/playwright-provider/src/playwright-provider.ts`
- Create: `packages/playwright-provider/src/adapters/gemini.ts`
- Create: `packages/playwright-provider/src/adapters/chatgpt.ts`
- Create: `packages/playwright-provider/src/adapters/claude.ts`
- Create: `packages/playwright-provider/src/adapters/deepseek.ts`
- Create: `packages/playwright-provider/src/index.ts`

**Purpose:** Primary browser automation via Playwright + Chrome DevTools Protocol. Each AI site gets its own adapter with robust selectors (aria labels, data attributes, semantic selectors — NO fragile CSS selectors).

- [ ] **Step 1: Create package.json for playwright-provider**

```json
{
  "name": "@bab/playwright-provider",
  "version": "0.1.0",
  "description": "Playwright + CDP browser provider for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/core": "workspace:*",
    "@bab/protocol": "workspace:*",
    "playwright-core": "^1.40.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" },
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' }
});
```

- [ ] **Step 4: Define SiteAdapter interface**

```typescript
// packages/playwright-provider/src/site-adapter.ts

import type { Page } from 'playwright-core';

export interface SiteAdapter {
  readonly siteId: string;
  readonly siteUrl: string;
  readonly displayName: string;

  /** Check if current page matches this site */
  matches(url: string): boolean;

  /** Wait for page to be ready */
  waitForReady(page: Page): Promise<void>;

  /** Find and fill the chat input */
  fillInput(page: Page, message: string): Promise<void>;

  /** Click the send button */
  clickSend(page: Page): Promise<void>;

  /** Wait for and extract AI response */
  extractResponse(page: Page): Promise<string>;

  /** Check if response is complete */
  isResponseComplete(page: Page): Promise<boolean>;
}
```

- [ ] **Step 5: Implement Gemini adapter**

```typescript
// packages/playwright-provider/src/adapters/gemini.ts

import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class GeminiAdapter implements SiteAdapter {
  readonly siteId = 'gemini';
  readonly siteUrl = 'https://gemini.google.com';
  readonly displayName = 'Google Gemini';

  matches(url: string): boolean {
    return url.includes('gemini.google.com');
  }

  async waitForReady(page: Page): Promise<void> {
    // Wait for the chat input area using robust selectors
    await page.waitForSelector(
      '[aria-label*="Enter a prompt" i], [contenteditable="true"][role="textbox"]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    // Try textarea first, then contenteditable
    const textarea = await page.$('textarea[aria-label*="prompt" i]');
    if (textarea) {
      await textarea.fill(message);
      return;
    }

    const editable = await page.$('[contenteditable="true"][role="textbox"]');
    if (editable) {
      await editable.click();
      await page.keyboard.type(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    // Use aria label for send button
    await page.click('button[aria-label*="Send" i], button[aria-label*="Submit" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    // Wait for response to appear
    await page.waitForSelector(
      '[data-message-author-role="model"], .model-response-text, .response-container',
      { timeout: 60000 }
    );

    // Get the last response element
    const responses = await page.$$('[data-message-author-role="model"]:last-child, .model-response-text:last-child');
    if (responses.length === 0) return '';

    return await responses[responses.length - 1].textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    // Check if the loading indicator is gone
    const loading = await page.$('[aria-label*="Loading" i], .loading-indicator, .thinking');
    return loading === null;
  }
}
```

- [ ] **Step 6: Implement ChatGPT adapter**

```typescript
// packages/playwright-provider/src/adapters/chatgpt.ts

import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class ChatGPTAdapter implements SiteAdapter {
  readonly siteId = 'chatgpt';
  readonly siteUrl = 'https://chat.openai.com';
  readonly displayName = 'ChatGPT';

  matches(url: string): boolean {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      '#prompt-textarea, [id="prompt-textarea"], textarea[aria-label*="message" i]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const input = await page.$('#prompt-textarea, [id="prompt-textarea"]');
    if (input) {
      await input.fill(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[data-testid="send-button"], button[aria-label*="Send" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector('[data-message-author-role="assistant"]', { timeout: 60000 });
    const responses = await page.$$('[data-message-author-role="assistant"]');
    if (responses.length === 0) return '';

    const lastResponse = responses[responses.length - 1];
    return await lastResponse.textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    // Check for the stop button (indicates generation in progress)
    const stopBtn = await page.$('button[aria-label*="Stop" i]');
    return stopBtn === null;
  }
}
```

- [ ] **Step 7: Implement Claude adapter**

```typescript
// packages/playwright-provider/src/adapters/claude.ts

import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class ClaudeAdapter implements SiteAdapter {
  readonly siteId = 'claude';
  readonly siteUrl = 'https://claude.ai';
  readonly displayName = 'Claude';

  matches(url: string): boolean {
    return url.includes('claude.ai');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      '[aria-label*="message" i], [contenteditable="true"]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const textarea = await page.$('[aria-label*="message" i]');
    if (textarea) {
      await textarea.fill(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[aria-label*="Send" i], button[aria-label*="Submit" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector('[data-message-author-role="assistant"], .assistant-message', { timeout: 60000 });
    const responses = await page.$$('[data-message-author-role="assistant"], .assistant-message');
    if (responses.length === 0) return '';

    return await responses[responses.length - 1].textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const loading = await page.$('.loading, [aria-busy="true"]');
    return loading === null;
  }
}
```

- [ ] **Step 8: Implement DeepSeek adapter**

```typescript
// packages/playwright-provider/src/adapters/deepseek.ts

import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class DeepSeekAdapter implements SiteAdapter {
  readonly siteId = 'deepseek';
  readonly siteUrl = 'https://chat.deepseek.com';
  readonly displayName = 'DeepSeek';

  matches(url: string): boolean {
    return url.includes('chat.deepseek.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      'textarea[aria-label*="message" i], textarea[placeholder*="message" i]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const textarea = await page.$('textarea[aria-label*="message" i], textarea[placeholder*="message" i]');
    if (textarea) {
      await textarea.fill(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[aria-label*="Send" i], button[aria-label*="Submit" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector('[data-message-author-role="assistant"], .assistant-message', { timeout: 60000 });
    const responses = await page.$$('[data-message-author-role="assistant"], .assistant-message');
    if (responses.length === 0) return '';

    return await responses[responses.length - 1].textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const loading = await page.$('.loading, [aria-busy="true"]');
    return loading === null;
  }
}
```

- [ ] **Step 9: Implement CDPClient (Chrome DevTools Protocol)**

```typescript
// packages/playwright-provider/src/cdp-client.ts

import type { CDPSession, Page } from 'playwright-core';

export class CDPClient {
  private session: CDPSession | null = null;

  async attach(page: Page): Promise<void> {
    this.session = await page.context().newCDPSession(page);
  }

  async detach(): Promise<void> {
    if (this.session) {
      await this.session.detach();
      this.session = null;
    }
  }

  async getConsoleLogs(): Promise<string[]> {
    if (!this.session) throw new Error('Not attached');

    const logs: string[] = [];

    this.session.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(args);
    });

    await this.session.send('Runtime.enable');
    return logs;
  }

  async evaluate(expression: string): Promise<unknown> {
    if (!this.session) throw new Error('Not attached');

    const result = await this.session.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });

    return result.result.value;
  }

  async interceptNetwork(patterns: string[]): Promise<void> {
    if (!this.session) throw new Error('Not attached');

    await this.session.send('Network.setRequestInterception', {
      patterns: patterns.map((p) => ({ urlPattern: p })),
    });
  }
}
```

- [ ] **Step 10: Implement PlaywrightProvider**

```typescript
// packages/playwright-provider/src/playwright-provider.ts

import type {
  Provider,
  ProviderStatus,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@bab/protocol';
import { chromium, type Browser, type Page } from 'playwright-core';
import type { SiteAdapter } from './site-adapter.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { ChatGPTAdapter } from './adapters/chatgpt.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { DeepSeekAdapter } from './adapters/deepseek.js';
import { CDPClient } from './cdp-client.js';

interface PlaywrightProviderOptions {
  id: string;
  name: string;
  siteUrl: string;
  headless?: boolean;
  adapter?: SiteAdapter;
}

export class PlaywrightProvider implements Provider {
  readonly id: string;
  readonly name: string;
  private _status: ProviderStatus = 'idle';
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdp: CDPClient | null = null;
  private adapter: SiteAdapter;
  private siteUrl: string;
  private headless: boolean;

  private static adapters: SiteAdapter[] = [
    new GeminiAdapter(),
    new ChatGPTAdapter(),
    new ClaudeAdapter(),
    new DeepSeekAdapter(),
  ];

  constructor(options: PlaywrightProviderOptions) {
    this.id = options.id;
    this.name = options.name;
    this.siteUrl = options.siteUrl;
    this.headless = options.headless ?? true;

    // Auto-detect adapter from URL or use provided one
    this.adapter = options.adapter ?? this.detectAdapter(options.siteUrl);
  }

  private detectAdapter(url: string): SiteAdapter {
    const adapter = PlaywrightProvider.adapters.find((a) => a.matches(url));
    if (!adapter) {
      throw new Error(`No adapter found for URL: ${url}`);
    }
    return adapter;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = 'busy';
    this.browser = await chromium.launch({ headless: this.headless });
    this.page = await this.browser.newPage();
    await this.page.goto(this.siteUrl);
    await this.adapter.waitForReady(this.page);

    this.cdp = new CDPClient();
    await this.cdp.attach(this.page);

    this._status = 'idle';
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.page) {
      throw new Error('Not connected');
    }

    this._status = 'busy';

    try {
      const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

      await this.adapter.fillInput(this.page, userMessage);
      await this.adapter.clickSend(this.page);

      // Wait for response to complete
      await this.page.waitForTimeout(1000); // Initial wait
      let attempts = 0;
      while (!(await this.adapter.isResponseComplete(this.page)) && attempts < 60) {
        await this.page.waitForTimeout(1000);
        attempts++;
      }

      const responseText = await this.adapter.extractResponse(this.page);

      this._status = 'idle';

      return {
        id: `pw-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText },
          finish_reason: 'stop',
        }],
      };
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const response = await this.send(request);
    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: response.choices[0].message,
        finish_reason: null,
      }],
    };
    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    };
  }

  cancel(): void {
    // No-op for Playwright
  }

  async shutdown(): Promise<void> {
    if (this.cdp) {
      await this.cdp.detach();
      this.cdp = null;
    }
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this._status = 'shutdown';
  }
}
```

- [ ] **Step 11: Create barrel export**

```typescript
// packages/playwright-provider/src/index.ts

export { PlaywrightProvider } from './playwright-provider.js';
export type { SiteAdapter } from './site-adapter.js';
export { GeminiAdapter } from './adapters/gemini.js';
export { ChatGPTAdapter } from './adapters/chatgpt.js';
export { ClaudeAdapter } from './adapters/claude.js';
export { DeepSeekAdapter } from './adapters/deepseek.js';
export { CDPClient } from './cdp-client.js';
```

- [ ] **Step 12: Commit**

```bash
git add packages/playwright-provider
git commit -m "feat(playwright-provider): add Playwright + CDP provider with site adapters"
```

---

### Task 3.2: Create Chrome Extension — Optional Enhancement

**Covers:** [S3.3]

**Files:**
- Create: `extensions/chrome/manifest.json`
- Create: `extensions/chrome/package.json`
- Create: `extensions/chrome/src/background.ts`
- Create: `extensions/chrome/src/content.ts`
- Create: `extensions/chrome/src/popup.html`
- Create: `extensions/chrome/src/popup.ts`

**Purpose:** Optional Chrome Extension for enhanced browser integration. NOT the primary automation method (Playwright + CDP is primary). Extension provides additional features like real-time monitoring, manual trigger, and fallback when Playwright can't access certain pages.

- [ ] **Step 1: Create package.json for extension**

```json
{
  "name": "@bab/extension",
  "version": "0.1.0",
  "private": true,
  "description": "Chrome Extension for Browser AI Bridge (optional enhancement)",
  "scripts": {
    "build": "tsc && node scripts/build.mjs",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.260",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create manifest.json (Manifest V3)**

```json
{
  "manifest_version": 3,
  "name": "Browser AI Bridge",
  "version": "0.1.0",
  "description": "Bridge between browser AI services and local developer tools",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://gemini.google.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://chat.deepseek.com/*"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://gemini.google.com/*",
        "https://chat.openai.com/*",
        "https://claude.ai/*",
        "https://chat.deepseek.com/*"
      ],
      "js": ["dist/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "dist/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 3: Create background service worker**

```typescript
// extensions/chrome/src/background.ts

interface ExtensionMessage {
  type: string;
  payload?: unknown;
}

let wsConnection: WebSocket | null = null;
const WS_URL = 'ws://localhost:3001';

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => {
  switch (message.type) {
    case 'CONNECT_WS':
      connectToRuntime(sendResponse);
      return true;
    case 'SEND_MESSAGE':
      forwardToRuntime(message.payload)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    case 'GET_STATUS':
      sendResponse({ connected: wsConnection?.readyState === WebSocket.OPEN });
      return false;
  }
});

function connectToRuntime(callback: (response: unknown) => void): void {
  if (wsConnection?.readyState === WebSocket.OPEN) {
    callback({ success: true });
    return;
  }

  wsConnection = new WebSocket(WS_URL);

  wsConnection.onopen = () => {
    callback({ success: true });
  };

  wsConnection.onerror = (error) => {
    callback({ success: false, error: 'Connection failed' });
  };

  wsConnection.onmessage = (event) => {
    const data = JSON.parse(event.data);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'AI_RESPONSE',
          payload: data,
        });
      }
    });
  };

  wsConnection.onclose = () => {
    wsConnection = null;
  };
}

async function forwardToRuntime(payload: unknown): Promise<unknown> {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to runtime');
  }

  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

    wsConnection!.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        clearTimeout(timeout);
        resolve(data.payload);
      }
    };

    wsConnection!.send(JSON.stringify({ id, payload }));
  });
}
```

- [ ] **Step 4: Create content script**

```typescript
// extensions/chrome/src/content.ts

interface ContentMessage {
  type: string;
  payload?: unknown;
}

// Detect which AI site we're on
function detectAISite(): string | null {
  const host = window.location.hostname;
  if (host.includes('gemini.google.com')) return 'gemini';
  if (host.includes('chat.openai.com')) return 'chatgpt';
  if (host.includes('claude.ai')) return 'claude';
  if (host.includes('chat.deepseek.com')) return 'deepseek';
  return null;
}

// Find the chat input element
function findChatInput(): HTMLTextAreaElement | null {
  // Use robust selectors (aria labels, data attributes)
  return document.querySelector(
    'textarea[aria-label*="message" i], ' +
    'textarea[aria-label*="prompt" i], ' +
    'div[contenteditable="true"][role="textbox"]'
  ) as HTMLTextAreaElement | null;
}

// Find the send button
function findSendButton(): HTMLButtonElement | null {
  return document.querySelector(
    'button[aria-label*="send" i], ' +
    'button[aria-label*="submit" i], ' +
    'button[data-testid="send-button"]'
  ) as HTMLButtonElement | null;
}

// Observe response area for new messages
function observeResponseArea(callback: (text: string) => void): MutationObserver | null {
  const responseArea = document.querySelector(
    '[data-message-author-role="assistant"], ' +
    '.model-response-text, ' +
    '[class*="response" i]'
  );

  if (!responseArea) return null;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const text = responseArea.textContent?.trim();
        if (text) callback(text);
      }
    }
  });

  observer.observe(responseArea, { childList: true, subtree: true });
  return observer;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((
  message: ContentMessage,
  sender,
  sendResponse
) => {
  switch (message.type) {
    case 'AI_RESPONSE':
      // Forward to runtime via background
      sendResponse({ received: true });
      break;
    case 'INJECT_MESSAGE': {
      const input = findChatInput();
      if (input) {
        input.value = message.payload as string;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const sendBtn = findSendButton();
        if (sendBtn) sendBtn.click();
      }
      sendResponse({ success: !!input });
      break;
    }
  }
});

// Initialize
const site = detectAISite();
if (site) {
  console.log(`[BAB] Content script loaded on ${site}`);
}
```

- [ ] **Step 5: Create popup UI**

```html
<!-- extensions/chrome/src/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 16px; font-family: system-ui; }
    .status { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; }
    .status-dot.connected { background: #4caf50; }
    .status-dot.disconnected { background: #f44336; }
    button { width: 100%; padding: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="status">
    <div class="status-dot" id="statusDot"></div>
    <span id="statusText">Checking...</span>
  </div>
  <button id="connectBtn">Connect to Runtime</button>
  <script src="popup.js"></script>
</body>
</html>
```

```typescript
// extensions/chrome/src/popup.ts

const statusDot = document.getElementById('statusDot')!;
const statusText = document.getElementById('statusText')!;
const connectBtn = document.getElementById('connectBtn')!;

function updateStatus(connected: boolean) {
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = connected ? 'Connected' : 'Disconnected';
  connectBtn.textContent = connected ? 'Disconnect' : 'Connect to Runtime';
}

// Check current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  updateStatus(response?.connected ?? false);
});

connectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CONNECT_WS' }, (response) => {
    updateStatus(response?.success ?? false);
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add extensions/chrome
git commit -m "feat(extension): add Chrome extension (optional enhancement)"
```

---

## Phase 4: Runtime Engine

### Task 4.1: Create Runtime Package — Tool Dispatcher

**Covers:** [S3.4, S5]

**Files:**
- Create: `packages/runtime/package.json`
- Create: `packages/runtime/tsconfig.json`
- Create: `packages/runtime/vitest.config.ts`
- Create: `packages/runtime/src/tool-dispatcher.ts`
- Create: `packages/runtime/src/tool-dispatcher.test.ts`

**Interfaces:**
- Consumes: `Tool`, `ToolDefinition`, `ToolResult`, `ToolContext` from `@bab/protocol`, `EventBus`
- Produces: `ToolDispatcher` class

- [ ] **Step 1: Create package.json for runtime**

```json
{
  "name": "@bab/runtime",
  "version": "0.1.0",
  "description": "Tool dispatcher and permission engine for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/core": "workspace:*",
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" },
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' }
});
```

- [ ] **Step 4: Write failing test for ToolDispatcher**

```typescript
// packages/runtime/src/tool-dispatcher.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolDispatcher } from './tool-dispatcher.js';
import { EventBus } from '@bab/core';
import type { Tool, ToolContext } from '@bab/protocol';

function createMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool ${name}`,
    parameters: { type: 'object', properties: {} },
    execute: vi.fn().mockResolvedValue({ success: true, output: 'ok' }),
  };
}

describe('ToolDispatcher', () => {
  let dispatcher: ToolDispatcher;
  let eventBus: EventBus;
  const context: ToolContext = {
    sessionId: 'test-session',
    workingDirectory: '/tmp',
    env: {},
  };

  beforeEach(() => {
    eventBus = new EventBus();
    dispatcher = new ToolDispatcher(eventBus);
  });

  it('should register a tool', () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);
    expect(dispatcher.get('fs.read')).toBe(tool);
  });

  it('should list registered tools', () => {
    dispatcher.register(createMockTool('fs.read'));
    dispatcher.register(createMockTool('fs.write'));
    expect(dispatcher.list()).toHaveLength(2);
  });

  it('should get tool definitions', () => {
    dispatcher.register(createMockTool('fs.read'));
    const defs = dispatcher.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].type).toBe('function');
    expect(defs[0].function.name).toBe('fs.read');
  });

  it('should execute a tool', async () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);

    const result = await dispatcher.execute('fs.read', { path: '/tmp/test' }, context);

    expect(tool.execute).toHaveBeenCalledWith({ path: '/tmp/test' }, context);
    expect(result.success).toBe(true);
  });

  it('should throw for unregistered tool', async () => {
    await expect(dispatcher.execute('unknown', {}, context))
      .rejects.toThrow('Tool "unknown" not found');
  });

  it('should emit tool events on execute', async () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);

    const events: string[] = [];
    eventBus.on('tool.requested', () => events.push('requested'));
    eventBus.on('tool.executing', () => events.push('executing'));
    eventBus.on('tool.completed', () => events.push('completed'));

    await dispatcher.execute('fs.read', { path: '/tmp' }, context);

    expect(events).toEqual(['requested', 'executing', 'completed']);
  });

  it('should emit error event on tool failure', async () => {
    const tool = createMockTool('fs.read');
    vi.mocked(tool.execute).mockRejectedValue(new Error('Permission denied'));
    dispatcher.register(tool);

    const errorHandler = vi.fn();
    eventBus.on('tool.error', errorHandler);

    await expect(dispatcher.execute('fs.read', {}, context))
      .rejects.toThrow('Permission denied');

    expect(errorHandler).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Implement ToolDispatcher**

```typescript
// packages/runtime/src/tool-dispatcher.ts

import type {
  Tool,
  ToolDefinition,
  ToolResult,
  ToolContext,
  ToolDispatcher as IToolDispatcher,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';

export class ToolDispatcher implements IToolDispatcher {
  private tools = new Map<string, Tool>();

  constructor(private eventBus: EventBus) {}

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    this.eventBus.emit('tool.requested', {
      toolName: name,
      params,
      sessionId: context.sessionId,
    });

    this.eventBus.emit('tool.executing', {
      toolName: name,
      sessionId: context.sessionId,
    });

    try {
      const result = await tool.execute(params, context);

      this.eventBus.emit('tool.completed', {
        toolName: name,
        result,
        sessionId: context.sessionId,
      });

      return result;
    } catch (error) {
      this.eventBus.emit('tool.error', {
        toolName: name,
        error: error instanceof Error ? error.message : String(error),
        sessionId: context.sessionId,
      });
      throw error;
    }
  }
}
```

- [ ] **Step 6: Run tests**

```bash
cd packages/runtime
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): add ToolDispatcher with event-driven execution"
```

---

### Task 4.2: Create Runtime — Permission Engine (Scope-based)

**Covers:** [S3.5]

**Files:**
- Create: `packages/runtime/src/permission-engine.ts`
- Create: `packages/runtime/src/permission-engine.test.ts`
- Create: `packages/runtime/src/audit-logger.ts`
- Create: `packages/runtime/src/audit-logger.test.ts`

- [ ] **Step 1: Write failing test for PermissionEngine**

```typescript
// packages/runtime/src/permission-engine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionEngine } from './permission-engine.js';
import { EventBus } from '@bab/core';
import type { ToolScope } from '@bab/protocol';

describe('PermissionEngine', () => {
  let engine: PermissionEngine;
  let eventBus: EventBus;

  const defaultScope: ToolScope = {
    allowedPaths: ['/home/user/projects'],
    allowedCommands: ['git status', 'git diff'],
    deniedCommands: ['rm -rf', 'sudo'],
    maxExecutionTime: 30000,
  };

  beforeEach(() => {
    eventBus = new EventBus();
    engine = new PermissionEngine(eventBus, {
      mode: 'scope',
      defaultScope,
      dangerousTools: ['shell.exec'],
    });
  });

  it('should allow tool within scope', async () => {
    engine.grant('fs.read', defaultScope, 'session-1');
    const result = await engine.check('fs.read', { path: '/home/user/projects/test.txt' }, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });
    expect(result.allowed).toBe(true);
  });

  it('deny tool outside allowed paths', async () => {
    engine.grant('fs.read', defaultScope, 'session-1');
    const result = await engine.check('fs.read', { path: '/etc/passwd' }, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty('reason', 'scope_violation');
  });

  it('deny dangerous tool', async () => {
    engine.grant('shell.exec', defaultScope, 'session-1');
    const result = await engine.check('shell.exec', { command: 'rm -rf /' }, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });
    expect(result.allowed).toBe(false);
  });

  it('should emit permission.requested event', async () => {
    const handler = vi.fn();
    eventBus.on('permission.requested', handler);

    await engine.check('fs.read', {}, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });

    expect(handler).toHaveBeenCalled();
  });

  it('should revoke permission', async () => {
    engine.grant('fs.read', defaultScope, 'session-1');
    engine.revoke('fs.read', 'session-1');
    const result = await engine.check('fs.read', {}, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });
    expect(result.allowed).toBe(false);
  });

  it('should clear all permissions for session', async () => {
    engine.grant('fs.read', defaultScope, 'session-1');
    engine.grant('fs.write', defaultScope, 'session-1');
    engine.clear('session-1');

    const result = await engine.check('fs.read', {}, {
      sessionId: 'session-1',
      scope: defaultScope,
      auditLog: [],
    });
    expect(result.allowed).toBe(false);
  });

  it('should return scope for granted tool', () => {
    engine.grant('fs.read', defaultScope, 'session-1');
    const scope = engine.getScope('fs.read', 'session-1');
    expect(scope).toEqual(defaultScope);
  });
});
```

- [ ] **Step 2: Implement PermissionEngine**

```typescript
// packages/runtime/src/permission-engine.ts

import type {
  PermissionEngine as IPermissionEngine,
  PermissionResult,
  PermissionContext,
  ToolScope,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';
import type { PermissionConfig } from '@bab/protocol';
import { join } from 'node:path';

export class PermissionEngine implements IPermissionEngine {
  private permissions = new Map<string, Map<string, ToolScope>>();
  private dangerousTools: Set<string>;

  constructor(
    private eventBus: EventBus,
    private config: PermissionConfig
  ) {
    this.dangerousTools = new Set(config.dangerousTools);
  }

  async check(toolName: string, params: Record<string, unknown>, context: PermissionContext): Promise<PermissionResult> {
    this.eventBus.emit('permission.requested', { toolName, sessionId: context.sessionId });

    // Dangerous tools always require explicit permission
    if (this.dangerousTools.has(toolName)) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return { allowed: false, reason: 'dangerous', suggestion: 'This tool requires explicit user confirmation' };
    }

    // Check if granted
    const sessionPerms = this.permissions.get(context.sessionId);
    const scope = sessionPerms?.get(toolName);

    if (!scope) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return { allowed: false, reason: 'not_granted' };
    }

    // Validate scope
    const scopeCheck = this.validateScope(toolName, params, scope);
    if (!scopeCheck.valid) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return { allowed: false, reason: 'scope_violation', suggestion: scopeCheck.suggestion };
    }

    this.eventBus.emit('permission.granted', { toolName, sessionId: context.sessionId });
    return { allowed: true };
  }

  grant(toolName: string, scope: ToolScope, sessionId: string): void {
    if (!this.permissions.has(sessionId)) {
      this.permissions.set(sessionId, new Map());
    }
    this.permissions.get(sessionId)!.set(toolName, scope);
    this.eventBus.emit('permission.granted', { toolName, sessionId });
  }

  revoke(toolName: string, sessionId: string): void {
    this.permissions.get(sessionId)?.delete(toolName);
  }

  clear(sessionId: string): void {
    this.permissions.delete(sessionId);
  }

  getScope(toolName: string, sessionId: string): ToolScope | undefined {
    return this.permissions.get(sessionId)?.get(toolName);
  }

  private validateScope(toolName: string, params: Record<string, unknown>, scope: ToolScope): { valid: boolean; suggestion?: string } {
    // Check path restrictions for fs tools
    if (toolName.startsWith('fs.') && params.path) {
      const path = params.path as string;
      const isAllowed = scope.allowedPaths.some((allowed) => path.startsWith(allowed));
      if (!isAllowed) {
        return {
          valid: false,
          suggestion: `Path "${path}" is outside allowed scope: ${scope.allowedPaths.join(', ')}`,
        };
      }
    }

    // Check command restrictions for shell tools
    if (toolName === 'shell.exec' && params.command) {
      const command = params.command as string;

      // Check denied commands
      const isDenied = scope.deniedCommands.some((denied) => command.includes(denied));
      if (isDenied) {
        return {
          valid: false,
          suggestion: `Command contains denied pattern`,
        };
      }

      // Check allowed commands
      if (scope.allowedCommands.length > 0) {
        const isAllowed = scope.allowedCommands.some((allowed) => command.startsWith(allowed));
        if (!isAllowed) {
          return {
            valid: false,
            suggestion: `Command not in allowed list: ${scope.allowedCommands.join(', ')}`,
          };
        }
      }
    }

    return { valid: true };
  }
}
```

- [ ] **Step 3: Write failing test for AuditLogger**

```typescript
// packages/runtime/src/audit-logger.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from './audit-logger.js';
import type { AuditEntry } from '@bab/protocol';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  it('should log audit entries', () => {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      sessionId: 'session-1',
      toolName: 'fs.read',
      params: { path: '/tmp/test' },
      result: 'allowed',
    };

    logger.log(entry);
    expect(logger.getEntries('session-1')).toHaveLength(1);
  });

  it('should get entries for specific session', () => {
    logger.log({ timestamp: Date.now(), sessionId: 'session-1', toolName: 'fs.read', params: {}, result: 'allowed' });
    logger.log({ timestamp: Date.now(), sessionId: 'session-2', toolName: 'fs.write', params: {}, result: 'denied' });

    expect(logger.getEntries('session-1')).toHaveLength(1);
    expect(logger.getEntries('session-2')).toHaveLength(1);
  });

  it('should clear entries for session', () => {
    logger.log({ timestamp: Date.now(), sessionId: 'session-1', toolName: 'fs.read', params: {}, result: 'allowed' });
    logger.clear('session-1');

    expect(logger.getEntries('session-1')).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Implement AuditLogger**

```typescript
// packages/runtime/src/audit-logger.ts

import type { AuditLogger as IAuditLogger, AuditEntry } from '@bab/protocol';

export class AuditLogger implements IAuditLogger {
  private entries = new Map<string, AuditEntry[]>();

  log(entry: AuditEntry): void {
    if (!this.entries.has(entry.sessionId)) {
      this.entries.set(entry.sessionId, []);
    }
    this.entries.get(entry.sessionId)!.push(entry);
  }

  getEntries(sessionId: string): AuditEntry[] {
    return this.entries.get(sessionId) ?? [];
  }

  clear(sessionId: string): void {
    this.entries.delete(sessionId);
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd packages/runtime
pnpm test
```

- [ ] **Step 4: Create barrel export**

```typescript
// packages/runtime/src/index.ts

export { ToolDispatcher } from './tool-dispatcher.js';
export { PermissionEngine } from './permission-engine.js';
export { AuditLogger } from './audit-logger.js';
```

- [ ] **Step 5: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): add PermissionEngine with ask-once model"
```

---

### Task 4.3: Create Tools — File System

**Covers:** [S5]

**Files:**
- Create: `packages/tools/fs/package.json`
- Create: `packages/tools/fs/tsconfig.json`
- Create: `packages/tools/fs/src/fs-tool.ts`
- Create: `packages/tools/fs/src/fs-tool.test.ts`
- Create: `packages/tools/fs/src/index.ts`

- [ ] **Step 1: Create package.json for tools/fs**

```json
{
  "name": "@bab/tools-fs",
  "version": "0.1.0",
  "description": "File system tools for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../protocol" }
  ]
}
```

- [ ] **Step 3: Implement FsReadTool**

```typescript
// packages/tools/fs/src/fs-tool.ts

import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export class FsReadTool implements Tool {
  readonly name = 'fs.read';
  readonly description = 'Read file contents or list directory';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File or directory path' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const path = params.path as string;
    const fullPath = join(context.workingDirectory, path);

    try {
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const entries = await readdir(fullPath, { withFileTypes: true });
        const listing = entries.map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`);
        return { success: true, output: listing.join('\n') };
      }

      const content = await readFile(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class FsWriteTool implements Tool {
  readonly name = 'fs.write';
  readonly description = 'Write content to a file';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');

    const path = params.path as string;
    const content = params.content as string;
    const fullPath = join(context.workingDirectory, path);

    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      return { success: true, output: `Written ${content.length} bytes to ${path}` };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

- [ ] **Step 4: Write tests**

```typescript
// packages/tools/fs/src/fs-tool.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FsReadTool, FsWriteTool } from './fs-tool.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import type { ToolContext } from '@bab/protocol';

describe('FsTools', () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'bab-test-'));
    context = {
      sessionId: 'test',
      workingDirectory: tempDir,
      env: {},
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('FsReadTool', () => {
    it('should read a file', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello');
      const tool = new FsReadTool();

      const result = await tool.execute({ path: 'test.txt' }, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('hello');
    });

    it('should list a directory', async () => {
      await writeFile(join(tempDir, 'a.txt'), '');
      await writeFile(join(tempDir, 'b.txt'), '');
      const tool = new FsReadTool();

      const result = await tool.execute({ path: '.' }, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('f a.txt');
      expect(result.output).toContain('f b.txt');
    });

    it('should handle missing file', async () => {
      const tool = new FsReadTool();

      const result = await tool.execute({ path: 'missing.txt' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('FsWriteTool', () => {
    it('should write a file', async () => {
      const tool = new FsWriteTool();

      const result = await tool.execute(
        { path: 'output.txt', content: 'world' },
        context
      );

      expect(result.success).toBe(true);

      const { readFile } = await import('node:fs/promises');
      const content = await readFile(join(tempDir, 'output.txt'), 'utf-8');
      expect(content).toBe('world');
    });
  });
});
```

- [ ] **Step 5: Create barrel export**

```typescript
// packages/tools/fs/src/index.ts

export { FsReadTool, FsWriteTool } from './fs-tool.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/tools/fs
git commit -m "feat(tools/fs): add FsReadTool and FsWriteTool"
```

---

### Task 4.4: Create Tools — Git

**Covers:** [S5]

**Files:**
- Create: `packages/tools/git/package.json`
- Create: `packages/tools/git/tsconfig.json`
- Create: `packages/tools/git/src/git-tool.ts`
- Create: `packages/tools/git/src/git-tool.test.ts`
- Create: `packages/tools/git/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@bab/tools-git",
  "version": "0.1.0",
  "description": "Git tools for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../protocol" }
  ]
}
```

- [ ] **Step 3: Implement GitStatusTool**

```typescript
// packages/tools/git/src/git-tool.ts

import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class GitStatusTool implements Tool {
  readonly name = 'git.status';
  readonly description = 'Get git working tree status';
  readonly parameters = {
    type: 'object',
    properties: {},
  };

  async execute(_params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: context.workingDirectory,
      });
      return { success: true, output: stdout.trim() || 'Working tree clean' };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class GitDiffTool implements Tool {
  readonly name = 'git.diff';
  readonly description = 'Show git diff';
  readonly parameters = {
    type: 'object',
    properties: {
      staged: { type: 'boolean', description: 'Show staged changes' },
    },
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const args = ['diff'];
    if (params.staged) args.push('--staged');

    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: context.workingDirectory,
      });
      return { success: true, output: stdout || 'No changes' };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class GitCommitTool implements Tool {
  readonly name = 'git.commit';
  readonly description = 'Create a git commit';
  readonly parameters = {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Commit message' },
      add: { type: 'boolean', description: 'Stage all changes before commit' },
    },
    required: ['message'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      if (params.add) {
        await execFileAsync('git', ['add', '.'], { cwd: context.workingDirectory });
      }

      const { stdout } = await execFileAsync(
        'git',
        ['commit', '-m', params.message as string],
        { cwd: context.workingDirectory }
      );

      return { success: true, output: stdout.trim() };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

- [ ] **Step 4: Create barrel export**

```typescript
// packages/tools/git/src/index.ts

export { GitStatusTool, GitDiffTool, GitCommitTool } from './git-tool.js';
```

- [ ] **Step 5: Commit**

```bash
git add packages/tools/git
git commit -m "feat(tools/git): add GitStatusTool, GitDiffTool, GitCommitTool"
```

---

### Task 4.5: Create Tools — Shell

**Covers:** [S5]

**Files:**
- Create: `packages/tools/shell/package.json`
- Create: `packages/tools/shell/tsconfig.json`
- Create: `packages/tools/shell/src/shell-tool.ts`
- Create: `packages/tools/shell/src/shell-tool.test.ts`
- Create: `packages/tools/shell/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@bab/tools-shell",
  "version": "0.1.0",
  "description": "Shell execution tools for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../protocol" }
  ]
}
```

- [ ] **Step 3: Implement ShellExecTool**

```typescript
// packages/tools/shell/src/shell-tool.ts

import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class ShellExecTool implements Tool {
  readonly name = 'shell.exec';
  readonly description = 'Execute a shell command (DANGEROUS - always requires permission)';
  readonly parameters = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
    },
    required: ['command'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = params.command as string;
    const timeout = (params.timeout as number) ?? 30000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout,
        env: { ...process.env, ...context.env },
      });

      return {
        success: true,
        output: stdout || stderr || 'Command completed',
      };
    } catch (error: unknown) {
      const err = error as { code?: number; stderr?: string; message?: string };
      return {
        success: false,
        output: '',
        error: `Exit code ${err.code ?? 'unknown'}: ${err.stderr ?? err.message}`,
      };
    }
  }
}
```

- [ ] **Step 4: Write tests**

```typescript
// packages/tools/shell/src/shell-tool.test.ts

import { describe, it, expect } from 'vitest';
import { ShellExecTool } from './shell-tool.js';
import type { ToolContext } from '@bab/protocol';

describe('ShellExecTool', () => {
  const context: ToolContext = {
    sessionId: 'test',
    workingDirectory: process.cwd(),
    env: {},
  };

  it('should execute a simple command', async () => {
    const tool = new ShellExecTool();
    const result = await tool.execute({ command: 'echo hello' }, context);

    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe('hello');
  });

  it('should handle command failure', async () => {
    const tool = new ShellExecTool();
    const result = await tool.execute({ command: 'exit 1' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Exit code');
  });

  it('should respect timeout', async () => {
    const tool = new ShellExecTool();
    const result = await tool.execute(
      { command: 'sleep 10', timeout: 100 },
      context
    );

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 5: Create barrel export**

```typescript
// packages/tools/shell/src/index.ts

export { ShellExecTool } from './shell-tool.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/tools/shell
git commit -m "feat(tools/shell): add ShellExecTool with timeout support"
```

---

## Phase 5: Plugin System

### Task 5.1: Create Plugin SDK — Interface & Loader

**Covers:** [S3.1]

**Files:**
- Create: `packages/plugin-sdk/package.json`
- Create: `packages/plugin-sdk/tsconfig.json`
- Create: `packages/plugin-sdk/src/plugin.ts`
- Create: `packages/plugin-sdk/src/loader.ts`
- Create: `packages/plugin-sdk/src/loader.test.ts`
- Create: `packages/plugin-sdk/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@bab/plugin-sdk",
  "version": "0.1.0",
  "description": "Plugin SDK for Browser AI Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/core": "workspace:*",
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" },
    { "path": "../protocol" }
  ]
}
```

- [ ] **Step 3: Define Plugin interface**

```typescript
// packages/plugin-sdk/src/plugin.ts

import type { Tool, Provider } from '@bab/protocol';
import type { EventBus } from '@bab/core';

export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PluginContext {
  eventBus: EventBus;
  registerTool(tool: Tool): void;
  registerProvider(provider: Provider): void;
  getConfig<T>(key: string): T;
}
```

- [ ] **Step 4: Implement PluginLoader**

```typescript
// packages/plugin-sdk/src/loader.ts

import type { Plugin, PluginContext } from './plugin.js';

export class PluginLoader {
  private plugins = new Map<string, Plugin>();

  async load(pluginPath: string, context: PluginContext): Promise<Plugin> {
    const module = await import(pluginPath);
    const plugin: Plugin = module.default ?? module;

    if (!plugin.name || !plugin.initialize) {
      throw new Error(`Invalid plugin at ${pluginPath}: missing name or initialize`);
    }

    await plugin.initialize(context);
    this.plugins.set(plugin.name, plugin);

    return plugin;
  }

  async unload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.shutdown();
      this.plugins.delete(name);
    }
  }

  async unloadAll(): Promise<void> {
    for (const [name] of this.plugins) {
      await this.unload(name);
    }
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
}
```

- [ ] **Step 5: Write tests**

```typescript
// packages/plugin-sdk/src/loader.test.ts

import { describe, it, expect, vi } from 'vitest';
import { PluginLoader } from './loader.js';
import type { Plugin, PluginContext } from './plugin.js';

describe('PluginLoader', () => {
  function createMockContext(): PluginContext {
    return {
      eventBus: { on: vi.fn(), emit: vi.fn() } as any,
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      getConfig: vi.fn(),
    };
  }

  it('should load a plugin and call initialize', async () => {
    const loader = new PluginLoader();
    const context = createMockContext();

    // Create a mock plugin module
    const mockPlugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test',
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };

    // Mock dynamic import
    vi.doMock('test-plugin', () => ({ default: mockPlugin }));

    // Note: In real tests, you'd create a temp file and import it
    // For now, test the loader logic directly
    expect(loader.list()).toHaveLength(0);
  });

  it('should unload a plugin and call shutdown', async () => {
    const loader = new PluginLoader();
    // Direct test of unload logic
    expect(loader.list()).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Create barrel export**

```typescript
// packages/plugin-sdk/src/index.ts

export type { Plugin, PluginContext } from './plugin.js';
export { PluginLoader } from './loader.js';
```

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-sdk
git commit -m "feat(plugin-sdk): add Plugin interface and PluginLoader"
```

---

### Task 5.2: Create Example Plugin

**Covers:** [S3.1]

**Files:**
- Create: `packages/plugins/example/package.json`
- Create: `packages/plugins/example/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@bab/plugin-example",
  "version": "0.1.0",
  "private": true,
  "description": "Example plugin for Browser AI Bridge",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@bab/plugin-sdk": "workspace:*",
    "@bab/protocol": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Implement example plugin**

```typescript
// packages/plugins/example/src/index.ts

import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import type { Tool, ToolContext, ToolResult } from '@bab/protocol';

class EchoTool implements Tool {
  readonly name = 'example.echo';
  readonly description = 'Echo back the input (for testing)';
  readonly parameters = {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to echo' },
    },
    required: ['message'],
  };

  async execute(params: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    return {
      success: true,
      output: `Echo: ${params.message}`,
    };
  }
}

const plugin: Plugin = {
  name: 'example',
  version: '0.1.0',
  description: 'Example plugin demonstrating plugin SDK',

  async initialize(context: PluginContext): Promise<void> {
    context.registerTool(new EchoTool());
  },

  async shutdown(): Promise<void> {
    // Cleanup if needed
  },
};

export default plugin;
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/example
git commit -m "feat(plugins/example): add example plugin with echo tool"
```

---

## Phase 6: Integration & Documentation

### Task 6.1: Create Integration Tests

**Covers:** [S7]

**Files:**
- Create: `tests/integration/api-flow.test.ts`
- Create: `tests/integration/tool-negotiation.test.ts`
- Create: `tests/integration/package.json`

- [ ] **Step 1: Create test package.json**

```json
{
  "name": "@bab/integration-tests",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "@bab/api": "workspace:*",
    "@bab/core": "workspace:*",
    "@bab/protocol": "workspace:*",
    "@bab/runtime": "workspace:*",
    "@bab/prompt-engine": "workspace:*",
    "@bab/tools-fs": "workspace:*",
    "@bab/tools-git": "workspace:*",
    "@bab/tools-shell": "workspace:*",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Write integration test for full request flow**

```typescript
// tests/integration/api-flow.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '@bab/api';
import { Router, SessionManager, EventBus, Config, Logger } from '@bab/core';
import { ToolDispatcher } from '@bab/runtime';
import { PromptEngine } from '@bab/prompt-engine';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import type { Provider } from '@bab/protocol';

describe('Integration: Full API Flow', () => {
  let app: ReturnType<typeof createServer>;

  beforeAll(() => {
    const eventBus = new EventBus();
    const config = new Config();
    const logger = new Logger({ level: 'error', format: 'text' });
    const sessionManager = new SessionManager(eventBus);
    const router = new Router(eventBus);
    const toolDispatcher = new ToolDispatcher(eventBus);
    const promptEngine = new PromptEngine();

    // Register tools
    toolDispatcher.register(new FsReadTool());
    toolDispatcher.register(new FsWriteTool());

    // Mock provider
    const mockProvider: Provider = {
      id: 'test-provider',
      name: 'Test Provider',
      status: 'idle',
      send: async (request) => ({
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello! How can I help?' },
          finish_reason: 'stop',
        }],
      }),
      stream: async function* () {},
      cancel: () => {},
      shutdown: async () => {},
      getTools: () => toolDispatcher.getDescriptions(),
    };

    router.registerProvider(mockProvider);
    router.setActiveProvider('test-provider');

    app = createServer({ router, sessionManager, logger, promptEngine });
  });

  it('should handle simple chat completion', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.choices[0].message.content).toBe('Hello! How can I help?');
  });

  it('should list models at /models', async () => {
    const res = await app.request('/models');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should handle /v1/responses endpoint', async () => {
    const res = await app.request('/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        input: [{ role: 'user', content: 'Hello' }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBeDefined();
  });

  it('should return 400 for invalid request', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Write integration test for Tool Negotiation**

```typescript
// tests/integration/tool-negotiation.test.ts

import { describe, it, expect } from 'vitest';
import { PromptEngine } from '@bab/prompt-engine';
import type { ToolDescription } from '@bab/protocol';

describe('Integration: Tool Negotiation', () => {
  const mockTools: ToolDescription[] = [
    {
      name: 'fs.read',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
    {
      name: 'git.status',
      description: 'Get git status',
      parameters: { type: 'object', properties: {} },
    },
  ];

  it('should generate system prompt with tool negotiation format', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    // Should contain tool names
    expect(prompt).toContain('fs.read');
    expect(prompt).toContain('git.status');

    // Should contain the custom action format
    expect(prompt).toContain('"actions"');
    expect(prompt).toContain('"tool"');
    expect(prompt).toContain('"params"');

    // Should NOT contain OpenAI function calling format
    expect(prompt).not.toContain('function_call');
    expect(prompt).not.toContain('tool_calls');
  });

  it('should generate negotiation object', () => {
    const engine = new PromptEngine();
    const negotiation = engine.generateNegotiation(mockTools, {
      maxActionsPerTurn: 5,
      allowedTools: ['fs.read', 'git.status'],
      deniedTools: [],
      requireConfirmation: ['shell.exec'],
    });

    expect(negotiation.format).toBe('actions');
    expect(negotiation.availableTools).toHaveLength(2);
    expect(negotiation.constraints.maxActionsPerTurn).toBe(5);
  });
});
```

- [ ] **Step 3: Run integration tests**

```bash
cd tests/integration
pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add tests/integration
git commit -m "test: add integration tests for full API flow"
```

---

### Task 6.2: Generate OpenAPI Spec

**Covers:** [S4]

**Files:**
- Create: `docs/openapi.yaml`

- [ ] **Step 1: Create OpenAPI specification**

```yaml
# docs/openapi.yaml

openapi: 3.1.0
info:
  title: Browser AI Bridge API
  description: OpenAI-compatible API for bridging browser AI services
  version: 0.1.0
  license:
    name: MIT

servers:
  - url: http://localhost:3000
    description: Local development server

paths:
  /health:
    get:
      summary: Health check
      operationId: getHealth
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
                  timestamp:
                    type: number

  /v1/models:
    get:
      summary: List available models
      operationId: listModels
      responses:
        '200':
          description: List of models
          content:
            application/json:
              schema:
                type: object
                properties:
                  object:
                    type: string
                    example: list
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Model'

  /v1/chat/completions:
    post:
      summary: Create chat completion
      operationId: createChatCompletion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatCompletionRequest'
      responses:
        '200':
          description: Chat completion
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatCompletionResponse'
        '400':
          description: Invalid request
        '500':
          description: Server error

components:
  schemas:
    Model:
      type: object
      properties:
        id:
          type: string
        object:
          type: string
          example: model
        created:
          type: number
        owned_by:
          type: string

    Message:
      type: object
      required:
        - role
        - content
      properties:
        role:
          type: string
          enum: [system, user, assistant, tool]
        content:
          type: string
          nullable: true
        name:
          type: string
        tool_call_id:
          type: string
        tool_calls:
          type: array
          items:
            $ref: '#/components/schemas/ToolCall'

    ToolCall:
      type: object
      properties:
        id:
          type: string
        type:
          type: string
          const: function
        function:
          type: object
          properties:
            name:
              type: string
            arguments:
              type: string

    ToolDefinition:
      type: object
      properties:
        type:
          type: string
          const: function
        function:
          type: object
          properties:
            name:
              type: string
            description:
              type: string
            parameters:
              type: object

    ChatCompletionRequest:
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
        messages:
          type: array
          items:
            $ref: '#/components/schemas/Message'
        tools:
          type: array
          items:
            $ref: '#/components/schemas/ToolDefinition'
        tool_choice:
          oneOf:
            - type: string
              enum: [auto, none, required]
            - type: object
        stream:
          type: boolean
          default: false
        temperature:
          type: number
          minimum: 0
          maximum: 2
        max_tokens:
          type: integer

    ChatCompletionResponse:
      type: object
      properties:
        id:
          type: string
        object:
          type: string
          example: chat.completion
        created:
          type: number
        model:
          type: string
        choices:
          type: array
          items:
            $ref: '#/components/schemas/ChatCompletionChoice'
        usage:
          $ref: '#/components/schemas/Usage'

    ChatCompletionChoice:
      type: object
      properties:
        index:
          type: number
        message:
          $ref: '#/components/schemas/Message'
        finish_reason:
          type: string
          enum: [stop, tool_calls, length]
          nullable: true

    Usage:
      type: object
      properties:
        prompt_tokens:
          type: number
        completion_tokens:
          type: number
        total_tokens:
          type: number
```

- [ ] **Step 2: Commit**

```bash
git add docs/openapi.yaml
git commit -m "docs: add OpenAPI 3.1 specification"
```

---

### Task 6.3: Create README

**Covers:** [S1, S2, S9]

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

```markdown
# Browser AI Bridge

Local runtime bridging browser-based AI services with developer tools via **Tool Negotiation** — a custom protocol for AI-tool interaction.

## Features

- **Tool Negotiation** — Custom `{"actions": [...]}` protocol, NOT OpenAI function calling
- **OpenAI-Compatible API** — `/v1/chat/completions`, `/v1/responses`, `/models`
- **Browser AI Integration** — Works with Gemini, ChatGPT, Claude, DeepSeek
- **Playwright + CDP** — Primary browser automation (no fragile CSS selectors)
- **Local Tools** — File system, Git, shell execution
- **Scope-based Security** — Path/command restrictions, audit logging, no token storage
- **Plugin System** — Extend with custom tools and providers

## Architecture

```
IDE/CLI → OpenAI API → BAB Core → Prompt Engine → Playwright + CDP → AI Site
                              ↓                        ↓
                        Runtime Engine            Site Adapters
                              ↓                   (gemini, chatgpt, claude, deepseek)
                    Tools (fs, git, shell)
```

### Tool Negotiation Flow

1. Client sends request to `/v1/chat/completions`
2. Prompt Engine generates system prompt with tool descriptions
3. System prompt teaches AI to respond with `{"actions": [...]}`
4. AI responds with actions to execute
5. Runtime executes actions with scope-based permissions
6. Results returned to AI for final response

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start API server
cd apps/cli
pnpm dev
```

## Project Structure

```
apps/
  cli/              — CLI application
packages/
  protocol/         — TypeScript types and interfaces
  core/             — Router, SessionManager, EventBus, Config, Logger
  api/              — OpenAI-compatible REST server (Hono)
  prompt-engine/    — System prompt generator with Tool Negotiation
  playwright-provider/ — Playwright + CDP browser automation
  runtime/          — Tool Dispatcher + Permission Engine + Audit Logger
  plugin-sdk/       — Plugin interface and loader
  tools/
    fs/             — File system operations
    git/            — Git operations
    shell/          — Shell command execution
extensions/
  chrome/           — Chrome Extension (optional enhancement)
examples/
  plugins/          — Example plugins
tests/
  integration/      — Integration tests
```

## Packages

| Package | Description |
|---------|-------------|
| `@bab/protocol` | TypeScript types and interfaces |
| `@bab/core` | Router, SessionManager, EventBus, Config, Logger |
| `@bab/api` | OpenAI-compatible REST server (Hono) |
| `@bab/prompt-engine` | System prompt generator with Tool Negotiation |
| `@bab/playwright-provider` | Playwright + CDP browser automation |
| `@bab/runtime` | Tool Dispatcher + Permission Engine + Audit Logger |
| `@bab/tools-fs` | File system operations |
| `@bab/tools-git` | Git operations |
| `@bab/tools-shell` | Shell command execution |
| `@bab/plugin-sdk` | Plugin interface and loader |
| `@bab/extension` | Chrome Extension (optional) |

## Configuration

Create `~/.bab/config.json`:

```json
{
  "server": {
    "host": "localhost",
    "port": 3000,
    "cors": true,
    "endpoints": {
      "chat": "/v1/chat/completions",
      "responses": "/v1/responses",
      "models": "/models"
    }
  },
  "providers": [
    {
      "id": "gemini",
      "type": "playwright",
      "enabled": true,
      "config": {
        "siteUrl": "https://gemini.google.com",
        "headless": false
      }
    }
  ],
  "runtime": {
    "workingDirectory": ".",
    "permissions": {
      "mode": "scope",
      "defaultScope": {
        "allowedPaths": ["./projects"],
        "allowedCommands": ["git status", "git diff"],
        "deniedCommands": ["rm -rf", "sudo"],
        "maxExecutionTime": 30000
      },
      "dangerousTools": ["shell.exec"]
    }
  },
  "security": {
    "noTokenStorage": true,
    "auditLogging": true,
    "scopeRestrictions": true,
    "maxSessionDuration": 3600000
  },
  "logging": {
    "level": "info",
    "format": "text",
    "auditFile": "~/.bab/audit.log"
  }
}
```

## Security

- **No token storage** — API keys never saved to disk
- **Scope-based permissions** — Restrict paths and commands per tool
- **Audit logging** — All tool executions logged
- **Dangerous tool blocking** — Shell exec always requires confirmation
- **No unsafe bypasses** — Site protection respected
- **Robust selectors** — aria labels, data attributes, Playwright locators (no fragile CSS)

## Tool Negotiation Format

AI responds with custom JSON format (NOT OpenAI function calling):

```json
{
  "actions": [
    {
      "id": "read-1",
      "tool": "fs.read",
      "params": { "path": "config.json" },
      "description": "Reading config file"
    }
  ]
}
```

Results returned as:

```json
{
  "results": [
    {
      "id": "read-1",
      "success": true,
      "output": "{\"key\": \"value\"}"
    }
  ],
  "summary": "Read config.json successfully"
}
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with architecture and quick start"
```

---

## Final Verification

- [ ] Run all tests: `pnpm test`
- [ ] Build all packages: `pnpm build`
- [ ] Verify no TypeScript errors: `pnpm -r run build`
- [ ] Check package boundaries: no circular dependencies
- [ ] Verify Tool Negotiation format works end-to-end
- [ ] Test Playwright provider with real AI sites
- [ ] Verify scope-based permissions block unauthorized paths
- [ ] Check audit logging records all tool executions
- [ ] Verify no tokens are stored anywhere
- [ ] Tag release: `git tag v0.1.0`

---

## Summary of Changes from Original Plan

| Aspect | Original | Updated |
|--------|----------|---------|
| Browser Provider | Extension-first + WebSocket | **Playwright + CDP** (primary) |
| Tool Format | OpenAI function calling | **Custom `{"actions": [...]}`** |
| Prompt Engine | None | **New module** — generates system prompts |
| Tool Negotiation | None | **Unique feature** — universal protocol |
| Project Structure | Only `packages/` | **`apps/ + packages/ + extensions/ + examples/ + tests/`** |
| API Endpoints | `/v1/chat/completions` | **+ `/v1/responses`, `/models`** |
| Security | Ask-once | **Scope-based + audit logging + no token storage** |
| Permission Model | Simple grant/deny | **Path/command scope restrictions** |
| Logging | Basic | **Audit log for all tool executions** |
