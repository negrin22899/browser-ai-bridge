# Session Fabric — Multi-Provider / Multi-Runtime Sessions

> Version: 1.0.0  
> Date: 2026-08-11  
> Status: Accepted

---

## Главный принцип

```
Session — это граница изоляции.
```

Каждая Session имеет:
- Свой Provider
- Свой Browser Runtime
- Свои Tools
- Свои Permissions
- Свои Capabilities
- Свой Workspace
- Свои Traces

Состояния, permissions, capabilities, browser sessions и traces **не смешиваются**.

---

## Архитектура

```
                    SESSION FABRIC
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
       Session A       Session B       Session C
          │               │               │
       Provider        Provider        Provider
          │               │               │
       Runtime         Runtime         Runtime
          │               │               │
       Browser         Browser         Local
          │               │               │
       Tools           Tools           Tools
          │               │               │
    Permissions     Permissions     Permissions
          │               │               │
       Workspace       Workspace       Workspace
```

---

## Session Identity

```typescript
interface SessionIdentity {
  sessionId: string;        // Unique session ID
  providerId: string;       // Provider ID
  browserSessionId?: string; // Browser session ID
  runtimeId: string;        // Runtime ID
  workspaceId?: string;     // Workspace ID
  createdAt: number;        // Creation time
}
```

### Пример

```
session_id:        sess_123
provider_id:       gemini
browser_session_id: browser_456
runtime_id:        local
workspace_id:      workspace_789
```

---

## Session State

### Lifecycle

```
created
  ↓
initializing
  ↓
ready
  ↓
running
  ↓
paused
  ↓
degraded
  ↓
recovering
  ↓
stopped
  ↓
destroyed
```

### State Info

```typescript
interface SessionStateInfo {
  state: SessionState;
  timestamp: number;
  duration: number;
  error?: string;
  recovery?: {
    attempt: number;
    maxAttempts: number;
    nextRetryMs: number;
  };
}
```

---

## Session Context

Каждый Request выполняется внутри SessionContext:

```typescript
interface SessionContext {
  identity: SessionIdentity;
  state: SessionStateInfo;
  tools: string[];
  capabilities: string[];
  permissions: Record<string, string>;
  activeRequests: string[];
  messages: Array<{ role: string; content: string }>;
  metadata: Record<string, unknown>;
}
```

### Pipeline

```
Request
  ↓
SessionContext
  ↓
Capability Resolution
  ↓
Tool Negotiation
  ↓
Provider
  ↓
Runtime
  ↓
Response
```

---

## Session Isolation

### Правило

```
Session A НЕ должна видеть:
- tools Session B
- permissions Session B
- browser tabs Session B
- workspace Session B
- credentials Session B
- traces Session B
```

### Изоляция компонентов

| Компонент | Изоляция |
|-----------|----------|
| Tool Registry | Session-scoped |
| Capability Resolver | Session-scoped |
| Permission Engine | Session-scoped |
| Browser Runtime | Session-scoped |
| Recorder | Session-scoped |
| Debugger | Session-scoped |

---

## Provider Binding

Каждая Session имеет один активный Provider:

```typescript
Session A → Provider = Gemini
Session B → Provider = ChatGPT
Session C → Provider = Local Model
```

### Provider Change

Если Provider меняется:
- Capabilities пересчитываются
- Tools renegotiate
- Browser requirements проверяются
- Trace фиксирует изменение

---

## Runtime Binding

Provider и Runtime — разные сущности:

```
Gemini → Browser Runtime → Chrome
Local Model → Local Runtime
Provider → Remote Runtime → SSH/Docker/WSL
```

Не связывать Session напрямую с Playwright.

---

## Workspace Binding

Session может быть привязана к workspace:

```typescript
Session A → Workspace = project-a
Session B → Workspace = project-b
```

Tool execution проверяет workspace boundary:
- filesystem
- git
- terminal

---

## Session-Scoped Tools

Tool availability вычисляется отдельно для каждой Session:

```
Session A:
  read_file ✓
  git_status ✓
  git_push ⚠ confirmation

Session B:
  read_file ✓
  git_status ✗
  git_push ✗
```

Никогда не использовать глобальный resolved toolset.

---

## Session-Scoped Capabilities

Capabilities вычисляются для конкретной Session:

```
Provider + Runtime + Browser + Permissions + Workspace → Session Capability Set
```

Если Browser отключился только в Session A:
- Session A: browser = unavailable
- Session B: browser = available

---

## Session-Scoped Permissions

Permission Engine поддерживает Session scope:

```
Session A: git.push = confirm
Session B: git.push = deny
```

Не позволять permission из одной Session влиять на другую.

---

## Session Events

Используем существующий Event Bus:

```typescript
// Lifecycle events
'session.created'
'session.initializing'
'session.ready'
'session.started'
'session.paused'
'session.degraded'
'session.recovering'
'session.stopped'
'session.destroyed'

// Change events
'session.provider.changed'
'session.runtime.changed'
'session.capabilities.changed'
'session.tools.changed'
```

---

## Session Trace

Каждый trace связан с:

```
session_id
request_id
provider_id
runtime_id
tool_call_id
```

Debugger позволяет:

```
Session → Traces → Requests → Tools → Browser actions
```

---

## Session Recovery

Если Provider или Browser Runtime падает:

```
Session
  ↓
degraded
  ↓
Recovery
  ↓
Provider/Runtime reconnect
  ↓
Capabilities re-evaluate
  ↓
Tools renegotiate
  ↓
ready/running
```

Используем существующие:
- HealthMonitor
- SessionRecovery
- Provider reliability
- Browser reliability

---

## Session Destroy

При уничтожении Session:
- Остановить active requests
- Закрыть browser sessions
- Освободить runtime resources
- Очистить temporary state
- Отписаться от events
- Закрыть trace resources

Не удалять историю/debug traces автоматически.

---

## Concurrent Sessions

```
Session A ── request ── Provider A
Session B ── request ── Provider B
Session C ── request ── Provider C
```

Выполняются независимо.
Один медленный Provider не блокирует остальные.

---

## Resource Limits

```typescript
interface SessionFabricConfig {
  maxSessions?: number;           // Default: 50
  maxConcurrentRequests?: number; // Per session, default: 10
  sessionTimeout?: number;        // Default: 5 minutes
}
```

Если лимит превышен:
- `SESSION_RESOURCE_LIMIT` ошибка

---

## Request Routing

```
request → session_id → Session Fabric → correct Provider → correct Runtime → correct Toolset
```

Не выбирать Session по глобальному mutable state.

---

## NO Global Current Session

Не использовать:

```typescript
// BAD: global currentSession
global.currentSession = session;
```

Вместо этого:

```typescript
// GOOD: explicit session context
const context = session.getContext();
```

---

## Session Snapshot

Для Debugger/diagnostics:

```typescript
const snapshot = sessionFabric.getSnapshot(sessionId);

// Returns:
{
  identity: { sessionId, providerId, runtimeId, ... },
  state: { state: 'running', timestamp: ..., duration: ... },
  tools: ['fs.read', 'git.status', ...],
  capabilities: ['streaming', 'files', ...],
  permissions: { 'fs.read': 'allowed', ... },
  activeRequests: ['req-1', 'req-2'],
  messages: [...],
  metadata: { ... },
}
```

---

## Runtime Inspector

```
SESSIONS

Session A
  ├── Provider: Gemini
  ├── Runtime: Local
  ├── Browser: Chrome
  ├── State: running
  ├── Tools: 12
  └── Active Requests: 1

Session B
  ├── Provider: ChatGPT
  ├── Runtime: Local
  ├── Browser: Chrome
  ├── State: degraded
  ├── Tools: 8
  └── Active Requests: 0
```

---

## API

```typescript
// Create session
const session = fabric.create({ providerId: 'gemini', model: 'gemini' });

// Get session
const session = fabric.get(sessionId);

// List sessions
const sessions = fabric.list();

// Lifecycle
fabric.start(sessionId);
fabric.pause(sessionId);
fabric.resume(sessionId);
fabric.stop(sessionId);
fabric.destroy(sessionId);
```

---

## CLI

```bash
bab session list
bab session inspect <id>
bab session stop <id>
```

---

## Tests

- Create session
- Destroy session
- Provider binding
- Runtime binding
- Browser binding
- Session isolation
- Tool isolation
- Capability isolation
- Permission isolation
- Workspace isolation
- Concurrent requests
- Provider failure
- Browser failure
- Recovery
- Session pause/resume
- Resource limits
- Request routing
- Trace correlation

---

## Security

Session Fabric не даёт дополнительный доступ.
Организует существующие:
- Provider
- Runtime
- Capabilities
- Tools
- Permissions

Любой реальный доступ проходит:
```
Tool → Permission Engine → Runtime → Execution
```

---

## Ссылки

- [Session Fabric](../packages/core/src/session-fabric.ts)
- [Session Manager](../packages/core/src/session-manager.ts)
- [Event Bus](../packages/core/src/event-bus.ts)
- [Provider Contract](./provider-contract.md)
- [Browser Runtime](./browser-runtime.md)
- [Capability Negotiation](./capability-negotiation.md)
