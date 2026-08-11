# Capability Negotiation — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Главный принцип

```
Tool visibility ≠ Tool authorization
```

- **Capability Resolver** определяет, ЧТО МОЖНО ПРЕДЛОЖИТЬ AI
- **Permission Engine** определяет, ЧТО МОЖНО ФАКТИЧЕСКИ ВЫПОЛНИТЬ

Эти системы НЕЛЬЗЯ объединять в одну.

---

## Как это работает

### Pipeline

```
Request
  ↓
Session
  ↓
Capability Resolver
  ↓
Tool Registry
  ↓
Available Tools
  ↓
Provider
  ↓
AI
  ↓
Tool request
  ↓
Permission Engine
  ↓
Runtime
  ↓
Tool result
  ↓
AI
  ↓
Response
```

### Формула

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

---

## Tool Requirements

Каждый Tool объявляет свои требования:

```typescript
interface ToolRequirements {
  providerCapabilities?: string[];  // Required provider capabilities
  runtimeCapabilities?: string[];   // Required runtime capabilities
  permissions?: string[];           // Required permissions
  requiresToolCalling?: boolean;    // Needs tool calling support
  requiresStreaming?: boolean;      // Needs streaming support
}
```

### Примеры

```typescript
// git_push requires network and git.push permission
const gitPushTool: Tool = {
  name: 'git.push',
  description: 'Push to remote',
  requirements: {
    runtimeCapabilities: ['git', 'network'],
    permissions: ['git.push'],
  },
  // ...
};

// read_file only needs filesystem.read
const readFileTool: Tool = {
  name: 'fs.read',
  description: 'Read file contents',
  requirements: {
    runtimeCapabilities: ['filesystem'],
    permissions: ['filesystem.read'],
  },
  // ...
};

// terminal needs terminal.execute
const terminalTool: Tool = {
  name: 'shell.exec',
  description: 'Execute shell command',
  requirements: {
    runtimeCapabilities: ['terminal'],
    permissions: ['terminal.execute'],
  },
  // ...
};
```

---

## Provider Capabilities

Provider сообщает свои возможности:

```typescript
interface ProviderCapabilities {
  streaming: boolean;
  images: boolean;
  files: boolean;
  thinking: boolean;
  toolCalling: boolean;
  webSearch: boolean;
  markdown: boolean;
  codeGeneration: boolean;
  multiModal: boolean;
  maxContextTokens?: number;
  maxOutputTokens?: number;
}
```

Если Provider не поддерживает tool calling:
- AI не получает Tools, которые требуют tool calling

---

## Runtime Capabilities

Runtime сообщает свои возможности:

```typescript
interface RuntimeCapabilities {
  features: string[];      // ['filesystem', 'git', 'terminal', 'browser']
  tools: string[];         // ['fs.read', 'fs.write', 'git.status']
  integrations: string[];  // ['github', 'gitlab']
  browserConnected: boolean;
  filesystemAvailable: boolean;
  gitAvailable: boolean;
  terminalAvailable: boolean;
}
```

Наличие capability ≠ разрешение.

---

## Permission Engine

Финальное решение учитывает permissions:

```
filesystem.read = allowed
filesystem.write = confirm
terminal.execute = denied
git.status = allowed
git.push = confirm
```

### Результат

Runtime выдаёт AI только:
- `read_file` — available
- `git_status` — available

А:
- `write_file` — requires confirmation
- `git_push` — requires confirmation
- `terminal` — denied (не передаётся AI)

---

## Tool Filtering

### Единый механизм

```typescript
const result = resolveAvailableTools({
  providerCapabilities: provider.getCapabilities(),
  runtimeCapabilities: {
    features: ['filesystem', 'git'],
    tools: ['fs.read', 'fs.write', 'git.status'],
    integrations: [],
    browserConnected: true,
    filesystemAvailable: true,
    gitAvailable: true,
    terminalAvailable: false,
  },
  permissions: {
    allowed: ['filesystem.read', 'git.status'],
    denied: ['terminal.execute'],
    confirm: ['filesystem.write', 'git.push'],
  },
  session: {
    id: 'session-123',
    state: 'connected',
    capabilities: [],
  },
  tools: toolRegistry.list(),
});
```

### Результат

```typescript
{
  available: [
    { name: 'fs.read', status: 'available', available: true },
    { name: 'git.status', status: 'available', available: true },
  ],
  unavailable: [
    { name: 'shell.exec', status: 'unavailable', reason: 'Runtime does not support: terminal' },
  ],
  denied: [
    { name: 'shell.exec', status: 'denied', reason: 'Permission denied: terminal.execute' },
  ],
  requiresConfirmation: [
    { name: 'fs.write', status: 'confirmation_required', reason: 'Requires confirmation: filesystem.write' },
    { name: 'git.push', status: 'confirmation_required', reason: 'Requires confirmation: git.push' },
  ],
  summary: {
    total: 5,
    availableCount: 2,
    unavailableCount: 1,
    deniedCount: 1,
    confirmationCount: 2,
  },
}
```

---

## Explainability

Для каждого недоступного Tool система объясняет причину:

### git_push — UNAVAILABLE

```
git_push is unavailable

Reason: Runtime does not support: network
Missing capabilities: network
```

### terminal — DENIED

```
terminal is denied

Reason: Permission denied: terminal.execute
```

### some_tool — UNSUPPORTED

```
some_tool is unavailable

Reason: Provider does not support tool calling
Missing capabilities: toolCalling
```

---

## Dynamic Negotiation

Capability set может измениться во время Session:

### Browser disconnected

```
Browser disconnected
  ↓
browser capability unavailable
  ↓
Resolver recalculates tools
  ↓
browser tools removed
```

### Browser recovered

```
Browser recovered
  ↓
capability restored
  ↓
Resolver recalculates
  ↓
browser tools available again
```

Не требуется перезапуск Runtime.

---

## Session-Level Capability Snapshot

Каждая Session хранит:

```typescript
interface SessionCapabilities {
  capabilitiesAtStart: string[];
  currentCapabilities: string[];
  toolsCurrentlyAvailable: string[];
  toolsRemoved: string[];
  toolsAdded: string[];
  changeReasons: Map<string, string>;
}
```

Изменения записываются в Event Bus.

---

## Tool Negotiation Events

```typescript
// Capability events
'capability.detected'    // { providerId, capabilities }
'capability.granted'     // { capability, providerId }
'capability.revoked'     // { capability, providerId, reason }
'capability.changed'     // { providerId, added, removed }

// Tool events
'tool.available'         // { toolName, sessionId }
'tool.unavailable'       // { toolName, sessionId, reason }
'tool.denied'            // { toolName, sessionId, reason }
'tool.confirmation_required' // { toolName, sessionId, reason }
```

---

## Security Requirement

Capability Negotiation НЕ является механизмом безопасности:

```
Tool visibility ≠ Tool authorization
```

Даже если Tool попал в Available Tools:

```
AI → Tool → Permission Engine → Runtime → Execution
```

Permission проверяется непосредственно перед выполнением.

---

## Race Conditions

Учитывается ситуация:

```
Resolver говорит: terminal = available

но между этим моментом и execute():
  - permission изменился
  - или Runtime capability исчезла
```

### Решение

Tool execution повторно проверяет:
- capability
- permission
- session
- runtime state

---

## Runtime Inspector

### CAPABILITIES секция

```
Provider:
✓ streaming
✓ toolCalling
✓ files
✗ webSearch

Runtime:
✓ filesystem.read
✓ git
✗ terminal
✓ browser

Tools:
✓ read_file
✓ git_status
⚠ git_push — confirmation required
✗ terminal — denied
```

---

## Тесты

### Unit Tests

- Provider supports capability
- Provider doesn't support capability
- Runtime supports capability
- Runtime doesn't support capability
- Permission allow
- Permission deny
- Permission confirm

### Integration Tests

- Capability changes during session
- Browser disconnect
- Browser recovery
- Tool becomes unavailable
- Tool becomes available
- Race condition
- Stale capability snapshot

### E2E Test

```
OpenCode
  ↓
Bridge
  ↓
Capability Resolver
  ↓
Tool Registry
  ↓
Provider
  ↓
AI
  ↓
Tool request
  ↓
Permission Engine
  ↓
Runtime
  ↓
Tool result
  ↓
AI
  ↓
Response
```

---

## Ссылки

- [Tool Types](../packages/protocol/src/types/tool.ts)
- [Tool Negotiation](../packages/protocol/src/tool-negotiation.ts)
- [Capability Resolver](../packages/protocol/src/capability-resolver.ts)
- [Provider Contract](./provider-contract.md)
