# Session Fabric — Unified Session System

> Version: 2.0.0  
> Date: 2026-08-11  
> Status: Accepted

---

## Главный принцип

```
Session = изолированный execution context.
```

Каждая Session имеет:
- AI Provider
- Browser Session
- Runtime Provider
- Workspace
- Capabilities
- Permissions
- Tools
- Trace

**Sessions НИКОГДА не делят mutable state.**

---

## Архитектура

```
SESSION FABRIC
      │
      ├── Session A
      │     ├── Provider: Gemini
      │     ├── Browser: Chrome Profile A
      │     ├── Runtime: Local
      │     ├── Workspace: /projects/app
      │     ├── Tools: [git, filesystem]
      │     └── Permissions: { fs.read: allow, ... }
      │
      ├── Session B
      │     ├── Provider: Gemini
      │     ├── Browser: Chrome Profile B
      │     ├── Runtime: Docker
      │     ├── Workspace: /projects/backend
      │     ├── Tools: [filesystem, shell]
      │     └── Permissions: { fs.read: allow, ... }
      │
      └── Session C
            ├── Provider: ChatGPT
            ├── Browser: Extension
            ├── Runtime: SSH
            ├── Workspace: /home/user/project
            └── Tools: [git, filesystem]
```

---

## Session Identity

```typescript
interface SessionIdentity {
  sessionId: string;          // Unique session ID
  providerId: string;         // AI Provider ID
  browserSessionId?: string;  // Browser session ID
  runtimeProviderId: string;  // Runtime Provider ID
  workspaceId?: string;       // Workspace ID
  createdAt: number;          // Creation time
}
```

---

## Session Lifecycle

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
terminated
```

---

## Session Context

```typescript
interface SessionContext {
  identity: SessionIdentity;
  state: SessionStateInfo;
  tools: string[];
  capabilities: string[];
  permissions: Record<string, string>;
  activeRequests: string[];
  messages: Array<{ role: string; content: string }>;
  workspace?: string;
  metadata: Record<string, unknown>;
}
```

---

## Isolation Rules

### Правило

```
Session A НЕ может получить доступ к:
- browser session Session B
- workspace Session B
- runtime Session B
- credentials Session B
- permissions Session B
- tool state Session B
```

### Проверка

Все cross-session access попытки отклоняются.

---

## Session Fabric

```typescript
class SessionFabric {
  // Create session
  create(config: SessionConfig): Session;
  
  // Get session
  get(sessionId: string): Session | undefined;
  
  // List sessions
  list(): Session[];
  listByState(state: SessionState): Session[];
  listByProvider(providerId: string): Session[];
  
  // Lifecycle
  start(sessionId: string): void;
  pause(sessionId: string): void;
  resume(sessionId: string): void;
  stop(sessionId: string): void;
  terminate(sessionId: string): void;
  
  // Degraded/Recovery
  degrade(sessionId: string, error: string): void;
  recover(sessionId: string): void;
  
  // Debugging
  getSnapshot(sessionId: string): SessionContext;
  getAllSnapshots(): SessionContext[];
}
```

---

## Session Locking

```typescript
const session = fabric.create({ providerId: 'gemini' });

// Acquire lock for exclusive operations
if (session.acquireLock()) {
  try {
    // Do exclusive work
  } finally {
    session.releaseLock();
  }
}
```

---

## Resource Ownership

| Component | Owner |
|-----------|-------|
| Session context | Session |
| Provider instances | Provider Manager |
| Browser sessions | Browser Manager |
| Runtime instances | Runtime Manager |
| Tools | Tool Registry |
| Permissions | Permission Engine |

Session Fabric **координирует**, не заменяет.

---

## Resource Cleanup

При `session.terminate()`:

```
stop tools
  ↓
stop provider requests
  ↓
disconnect browser
  ↓
release runtime resources
  ↓
flush recorder
  ↓
complete traces
  ↓
release session context
```

Cleanup **idempotent** — повторный terminate не ломает систему.

---

## Failure Isolation

```
Browser A crashes → Session A degraded
                   → Session B unaffected

Runtime A disconnects → Session A degraded
                       → Session C unaffected

Provider A error → Session A degraded
                  → Session B unaffected
```

---

## Session Events

```typescript
// Lifecycle
'session.created'
'session.initializing'
'session.ready'
'session.started'
'session.paused'
'session.resumed'
'session.degraded'
'session.recovering'
'session.stopped'
'session.terminated'

// Changes
'session.provider_changed'
'session.runtime_changed'
'session.browser_changed'
'session.capabilities_changed'
'session.tools_changed'
```

---

## Session + Debugger

```
Trace → Session → Provider → Runtime → Browser → Tool

Session → all traces
```

---

## Session + Permissions

Permissions принадлежат Session Context:

```
Session A: git.push = confirm
Session B: git.push = deny
```

Effective permissions вычисляются для Session.

---

## Session + Tools

Tool availability вычисляется отдельно для каждой Session:

```
Session A: [git, filesystem, browser]
Session B: [browser, web]
```

Не использовать глобальный список.

---

## Tests

- Session creation
- Lifecycle
- Multi-session
- Provider isolation
- Browser isolation
- Runtime isolation
- Workspace isolation
- Permission isolation
- Tool isolation
- Capability recalculation
- Provider failure
- Browser failure
- Runtime failure
- Recovery
- Cleanup
- Idempotent terminate
- Concurrency
- Session locking
- Cross-session access denial

---

## E2E

```
Session A → Gemini → Chrome A → Local Runtime → Workspace A → Tools A
Session B → Gemini → Chrome B → Docker Runtime → Workspace B → Tools B

Действия Session A НЕ воздействуют на Session B.
```

---

## Ссылки

- [Session Fabric](../packages/core/src/session-fabric.ts)
- [Session Manager](../packages/core/src/session-manager.ts)
- [Provider Contract](./provider-contract.md)
- [Browser Runtime](./browser-runtime.md)
- [Runtime Providers](./runtime-providers.md)
- [Capability Negotiation](./capability-negotiation.md)
