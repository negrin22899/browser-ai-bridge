# Browser AI Bridge — Полная архитектура и описание

## Идея проекта

**Browser AI Bridge (BAB)** — это open-source runtime, который позволяет использовать AI провайдеры (Gemini, ChatGPT, Claude, DeepSeek) через браузерную автоматизацию. Вместо API ключей, BAB использует уже залогиненные сессии пользователя в браузере.

**Главная идея:** AI работает через привычный веб-интерфейс, а реальные действия выполняются на локальной машине пользователя. При этом AI не имеет прямого доступа к компьютеру — всё проходит через систему permissions и capabilities.

**Ключевая архитектурная особенность:** BAB не просто мост к AI — это полноценная AI runtime платформа с изоляцией сессий, dynamic tool negotiation, capability resolver, и поддержкой multiple execution environments (Local, Docker, WSL, SSH).

---

## Полная архитектура

```
                        ANY AI CLIENT
                             │
                 ┌───────────┴───────────┐
                 │                       │
              OpenCode                 IDE
                 │                       │
                 └───────────┬───────────┘
                             ▼
                    BROWSER AI BRIDGE
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
      PROVIDERS          RUNTIME             PLUGINS
          │                  │                  │
    Gemini/ChatGPT      Files/Git/CLI      Community
    Claude/etc.         Browser/etc.       Extensions
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                      LOCAL MACHINE
```

### Слои архитектуры:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SESSION FABRIC                            │
│  Multi-session orchestration, isolation, lifecycle management    │
├─────────────────────────────────────────────────────────────────┤
│                        AI DEBUGGER                               │
│  Traces, timelines, breakpoints, step replay, comparison         │
├─────────────────────────────────────────────────────────────────┤
│                     CAPABILITY RESOLVER                          │
│  Provider + Runtime + Permissions → Available toolset            │
├─────────────────────────────────────────────────────────────────┤
│                    TOOL NEGOTIATION                              │
│  Dynamic tool filtering based on capabilities                    │
├─────────────────────────────────────────────────────────────────┤
│                    PERMISSION ENGINE                             │
│  Allow/Confirm/Deny per tool per session                         │
├─────────────────────────────────────────────────────────────────┤
│               ┌─────────────────────────┐                       │
│               │    PROVIDER LAYER        │                       │
│               │  ┌─────┬─────┬─────┐   │                       │
│               │  │Gemini│ChatGPT│Claude│  │                       │
│               │  └─────┴─────┴─────┘   │                       │
│               │  Unified Provider v2    │                       │
│               └─────────────────────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│               ┌─────────────────────────┐                       │
│               │   BROWSER RUNTIME       │                       │
│               │  ┌─────────┬─────────┐  │                       │
│               │  │Playwright│   CDP   │  │                       │
│               │  └─────────┴─────────┘  │                       │
│               │  BrowserRuntime interface│                       │
│               └─────────────────────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│               ┌─────────────────────────┐                       │
│               │   EXECUTION RUNTIME     │                       │
│               │  ┌─────┬─────┬─────┐   │                       │
│               │  │Local│Docker│ SSH  │  │                       │
│               │  └─────┴─────┴─────┘   │                       │
│               │  RuntimeProvider interface│                      │
│               └─────────────────────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│                    MCP ADAPTER                                   │
│  MCP as adapter, not foundation                                  │
├─────────────────────────────────────────────────────────────────┤
│                    API SERVER                                    │
│  OpenAI-compatible, rate limiting, metrics, caching              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ключевые компоненты

### 1. Provider Abstraction 2.0

```typescript
interface Provider {
  readonly metadata: ProviderMetadata;  // id, name, version, type, transport
  readonly state: ProviderStateInfo;     // discovered → connected → degraded
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<ProviderHealth>;
  getCapabilities(): ProviderCapabilities;
  hasCapability(name: string): boolean;
  send(request): Promise<Response>;
  stream(request): AsyncIterable<Chunk>;
  cancel(): void;
}
```

**12 нормализованных кодов ошибок:**
AUTH_REQUIRED, BROWSER_UNAVAILABLE, PAGE_NOT_FOUND, UI_CHANGED, NETWORK_ERROR, TIMEOUT, RATE_LIMITED, PROVIDER_ERROR, CAPABILITY_UNAVAILABLE, SESSION_EXPIRED, REQUEST_CANCELLED, UNKNOWN

### 2. Browser Runtime (Replaceable)

```typescript
interface BrowserRuntime {
  readonly metadata: BrowserAdapterMetadata;
  readonly state: BrowserState;
  readonly capabilities: BrowserCapabilities;
  
  connect(options?): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<BrowserHealthResult>;
  
  // Tab management
  listTabs(): Promise<BrowserTab[]>;
  createTab(url?): Promise<BrowserTab>;
  
  // DOM interaction
  find(selector): Promise<BrowserElement | null>;
  click(selector): Promise<void>;
  type(selector, text): Promise<void>;
  read(selector): Promise<string>;
  
  // Navigation
  navigate(url): Promise<void>;
  screenshot(): Promise<Buffer>;
  evaluate<T>(script): Promise<T>;
}
```

**Адаптеры:** PlaywrightAdapter ✅, CDPAdapter 🔲, ExtensionAdapter 🔲

### 3. Runtime Provider

```typescript
interface RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata;
  readonly state: RuntimeState;
  readonly capabilities: RuntimeCapabilities;
  
  connect(options?): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<RuntimeHealthResult>;
  
  execute(command): Promise<RuntimeExecutionResult>;
  cancel(executionId): Promise<void>;
  
  // Filesystem
  readFile(path): Promise<string>;
  writeFile(path, content): Promise<void>;
  
  // Workspace
  getWorkspaceRoot(): string;
  isInWorkspace(path): string;
}
```

**Провайдеры:** LocalRuntimeProvider ✅, DockerRuntimeProvider 🔲, WSLRuntimeProvider 🔲, SSHRuntimeProvider 🔲

### 4. Session Fabric

```typescript
interface Session {
  readonly id: string;
  readonly providerId: string;
  readonly runtimeProviderId: string;
  readonly workspace?: string;
  
  // Tools, capabilities, permissions - session-scoped
  setTools(tools: string[]): void;
  setCapabilities(capabilities: string[]): void;
  setPermissions(permissions: Record<string, string>): void;
  
  // Locking for exclusive operations
  acquireLock(): boolean;
  releaseLock(): void;
  
  // Context snapshot for debugging
  getContext(): SessionContext;
}

class SessionFabric {
  create(config): Session;
  get(id): Session | undefined;
  list(): Session[];
  start(id): void;
  pause(id): void;
  resume(id): void;
  stop(id): void;
  terminate(id): void;
}
```

**Ключевой принцип:** Session = изолированный execution context. Session A НЕ может получить доступ к данным Session B.

### 5. Capability Resolver & Tool Negotiation

```
User permissions
      +
Provider capabilities
      +
Runtime capabilities
      +
Tool requirements
      ↓
Capability Resolver
      ↓
Available toolset
```

**Главный принцип:** Tool visibility ≠ Tool authorization

### 6. AI Debugger

```
Trace Collector
  ↓
Timeline Builder
  ↓
Debug Controller (breakpoints, pause/resume)
  ↓
Step Replay Controller
  ↓
Comparison Mode
```

### 7. MCP Adapter

```
MCP Server → MCP Adapter → BAB Tool Registry → Capability Resolver → Permission Engine → AI
```

**Namespace:** `mcp.<serverId>.<toolName>` (e.g., `mcp.github.create_issue`)

---

## Что реализовано

| Компонент | Статус |
|-----------|--------|
| Core (EventBus, Logger, Config) | ✅ |
| Protocol типы | ✅ |
| Runtime (ToolDispatcher, Permissions, Audit) | ✅ |
| API Server (OpenAI-compatible) | ✅ |
| Plugin SDK (Builder, Validator, Hot-reload) | ✅ |
| Gemini Provider | ✅ |
| ChatGPT Provider | ✅ |
| Claude Provider | ✅ |
| DeepSeek Provider | ✅ |
| Anthropic API Adapter | ✅ |
| Google API Adapter | ✅ |
| Browser Runtime (PlaywrightAdapter) | ✅ |
| CDP Adapter | 🔲 Stub |
| Extension Adapter | 🔲 Stub |
| Local Runtime Provider | ✅ |
| Docker Runtime Provider | 🔲 Stub |
| WSL Runtime Provider | 🔲 Stub |
| SSH Runtime Provider | 🔲 Stub |
| Session Fabric | ✅ |
| Capability Resolver | ✅ |
| Tool Negotiation | ✅ |
| Permission Engine | ✅ |
| AI Debugger | ✅ |
| MCP Adapter | ✅ |
| Chrome Extension | ✅ |
| Desktop App (Electron) | ✅ |
| CLI | ✅ |
| Dashboard (React) | ✅ |
| Hardening Tests | ✅ |
| Documentation | ✅ |

---

## Репозиторий

https://github.com/negrin22899/browser-ai-bridge

---

## Для обсуждения

Основные вопросы для обсуждения:

1. **Архитектурные решения** — правильно ли разделены слои? Есть ли лишние абстракции?

2. **Provider v2** — достаточно ли контракт? Что не хватает?

3. **Session Fabric** — правильная ли изоляция? Race conditions?

4. **Runtime Providers** — Local реализован, Docker/WSL/SSH stubs. Какой приоритет?

5. **Tool Negotiation** — capability-driven runtime — это правильный подход?

6. **MCP Adapter** — adapter vs foundation — правильное решение?

7. **AI Debugger** — достаточно ли для production debugging?

8. **Что не хватает** — что критично для v1.0 production release?

9. **Конкурентные преимущества** — чем BAB отличается от существующих решений?

10. **Roadmap** — что делать дальше?
