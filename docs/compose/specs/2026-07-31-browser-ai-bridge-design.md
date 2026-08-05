# Browser AI Bridge — Design Specification

Version: 1.0 | Date: 2026-07-31

---

## [S1] Problem

Browser-based AI services (Gemini, ChatGPT, Claude, DeepSeek) are isolated web applications with no programmatic interface for local developer tools. Developers must manually copy-paste between AI chats and their IDE/terminal. There is no unified, open-source bridge that allows local tooling (file system, Git, shell) to interact with browser AI while maintaining security boundaries.

## [S2] Solution Overview

Browser AI Bridge (BAB) is a local runtime that exposes an OpenAI-compatible REST API, routes requests to browser-based AI through a Browser Extension + WebSocket bridge, and executes local tool calls through a permission-controlled Runtime. The system is organized as a pnpm monorepo with strict package boundaries.

```
IDE/CLI → OpenAI API → BAB Core → Browser Provider → Extension → AI Site
                              ↓
                        Runtime Engine → Tools (fs, git, shell)
```

## [S3] Architecture Decisions

### [S3.1] Monorepo Structure (pnpm workspaces)

```
packages/
  core/           — Router, SessionManager, EventBus, Config, Logger
  protocol/       — TypeScript types, interfaces (Provider, Tool, Runtime)
  api/            — OpenAI-compatible REST server (Hono)
  browser-provider/ — WebSocket bridge client, DOM automation
  playwright-provider/ — Headless fallback via Playwright
  runtime/        — Tool Dispatcher, Permission Engine
  tools/
    fs/           — File system operations
    git/          — Git operations
    shell/        — Terminal/shell execution
  plugin-sdk/     — Plugin interface and loader
  extension/      — Chrome Extension (Manifest V3)
  prompts/        — System prompts and templates
```

### [S3.2] Provider Architecture

Universal `Provider` interface with per-site adapter plugins:

```typescript
interface Provider {
  id: string;
  name: string;
  send(message: Message): Promise<Response>;
  stream(message: Message): AsyncIterable<Chunk>;
  cancel(): void;
  shutdown(): Promise<void>;
}
```

Each AI site gets its own adapter (Gemini, ChatGPT, Claude, DeepSeek). The provider manager selects the active adapter based on session config.

### [S3.3] Browser Interaction — Hybrid Approach

**Primary**: Browser Extension (Manifest V3, Chrome)
- Injects into AI chat pages
- Intercepts input/output via DOM observation
- Communicates with local Runtime via WebSocket
- Handles authentication naturally (user is already logged in)

**Fallback**: Playwright Provider
- For headless/CI scenarios
- Direct DOM automation without extension
- Less stable but requires no browser installation

### [S3.4] Tool Protocol — OpenAI Function Calling

Primary format: OpenAI `tools` parameter with JSON Schema definitions. All internal tool calls use this format. Anthropic `tool_use` format supported via adapter layer.

```typescript
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}
```

### [S3.5] Security Model — Ask-Once Per Session

Permission Engine with ask-once behavior:
- First call to each tool in a session → prompt user for confirmation
- Subsequent calls to same tool → auto-approved for session lifetime
- Dangerous operations (rm -rf, force push) → always ask regardless
- Policy config file for automation/CI overrides

### [S3.6] Inter-Package Communication — Event Bus

All components communicate through typed events. No direct coupling between packages.

```typescript
interface EventBus {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): () => void;
}
```

## [S4] API Surface

OpenAI-compatible REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Main chat endpoint (streaming via SSE) |
| `/v1/models` | GET | List available providers |
| `/v1/sessions` | POST | Create session |
| `/v1/sessions/:id` | GET | Get session state |
| `/health` | GET | Health check |

## [S5] Data Flow

### Request Flow
```
Client → /v1/chat/completions → Router → SessionManager
  → Provider → [Browser Extension ↔ WebSocket ↔ Runtime]
  → AI Site → Response → Provider → Router → Client
```

### Tool Call Flow
```
AI returns tool_calls → Provider extracts → Runtime receives
  → Permission Engine checks → Tool executes → Result
  → Provider sends result back to AI → Final response
```

## [S6] Package Dependencies (Strict Direction)

```
api → core → protocol
browser-provider → core, protocol
playwright-provider → core, protocol
runtime → core, protocol
tools/* → runtime, protocol
plugin-sdk → core, protocol
extension → (standalone, communicates via WebSocket)
```

**Forbidden**: tools → core, provider → tools, extension → runtime

## [S7] Testing Strategy

| Layer | Framework | Coverage Target |
|-------|-----------|-----------------|
| Unit tests | Vitest | 90%+ per package |
| Integration tests | Vitest | Core flows (request → response) |
| E2E tests | Playwright | Browser extension + API |
| API tests | Vitest + supertest | All endpoints |

Each phase: code → unit tests → integration tests → README.

## [S8] Implementation Phases

### Phase 1: Monorepo + Core Foundation
- pnpm workspace config
- `@bab/core`: Router, SessionManager, EventBus, Config, Logger
- `@bab/protocol`: TypeScript types and interfaces
- DI container

### Phase 2: OpenAI-Compatible API
- `@bab/api`: Hono server with `/v1/chat/completions`
- SSE streaming support
- Request/response transformation

### Phase 3: Browser Provider
- `@bab/browser-provider`: WebSocket bridge client
- `@bab/extension`: Chrome Extension (Manifest V3)
- `@bab/playwright-provider`: Headless fallback

### Phase 4: Runtime Engine
- `@bab/runtime`: Tool Dispatcher + Permission Engine
- `@bab/tools/fs`, `@bab/tools/git`, `@bab/tools/shell`
- Ask-once permission model

### Phase 5: Plugin System
- `@bab/plugin-sdk`: Plugin interface
- Plugin loader with hot-reload
- Example plugins

### Phase 6: Tests + Documentation
- Integration + E2E tests
- OpenAPI spec
- README + User Guide

## [S9] Constraints

- No cloud dependencies — all local
- No unsafe site protection bypasses
- No fragile CSS selectors — use robust automation mechanisms (aria labels, data attributes, semantic selectors)
- Strict TypeScript throughout
- All packages independently publishable

## [S10] Non-Goals

- Cloud storage of user data
- Own LLM implementation
- IDE replacement
- Actions without user control
