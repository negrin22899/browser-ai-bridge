# Runtime Providers — Local / Docker / WSL / SSH / Remote

> Version: 1.0.0  
> Date: 2026-08-11  
> Status: Accepted

---

## Главный принцип

```
AI Provider ≠ Runtime Provider

Gemini/ChatGPT/Claude = AI Provider
Local/Docker/WSL/SSH = Runtime Provider
```

---

## Архитектура

```
AI
 ↓
Session
 ↓
Tool
 ↓
Permission Engine
 ↓
Runtime Provider
 ├── Local
 ├── Docker
 ├── WSL
 ├── SSH
 └── Remote
```

---

## RuntimeProvider Interface

```typescript
interface RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata;
  readonly state: RuntimeState;
  readonly capabilities: RuntimeCapabilities;

  // Lifecycle
  connect(options?: RuntimeConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Health
  health(): Promise<RuntimeHealthResult>;

  // Execution
  execute(command: RuntimeCommand): Promise<RuntimeExecutionResult>;
  cancel(executionId: string): Promise<void>;

  // Filesystem
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listDirectory(path: string): Promise<DirectoryEntry[]>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;

  // Workspace
  getWorkspaceRoot(): string;
  isInWorkspace(path: string): boolean;
  resolvePath(...segments: string[]): string;
}
```

---

## Runtime Providers

### LocalRuntimeProvider ✅ Implemented

```typescript
const runtime = new LocalRuntimeProvider();
await runtime.connect({ workspace: '/path/to/project' });

// Execute command
const result = await runtime.execute({
  command: 'git',
  args: ['status'],
  cwd: '/path/to/project',
});

// File operations
const content = await runtime.readFile('package.json');
await runtime.writeFile('output.txt', 'Hello');
```

### DockerRuntimeProvider 🔲 Stub

```typescript
const runtime = new DockerRuntimeProvider();
await runtime.connect({
  workspace: '/path/to/project',
  docker: {
    image: 'node:20',
    volumes: [{ host: '/path', container: '/workspace' }],
  },
});
```

### WSLRuntimeProvider 🔲 Stub

```typescript
const runtime = new WSLRuntimeProvider();
await runtime.connect({
  workspace: '/mnt/c/projects/app',
  wsl: { distribution: 'Ubuntu' },
});
```

### SSHRuntimeProvider 🔲 Stub

```typescript
const runtime = new SSHRuntimeProvider();
await runtime.connect({
  workspace: '/home/user/project',
  ssh: {
    host: 'remote-server.com',
    username: 'user',
    privateKeyPath: '~/.ssh/id_rsa',
  },
});
```

---

## Runtime Capabilities

```typescript
interface RuntimeCapabilities {
  filesystemRead: boolean;
  filesystemWrite: boolean;
  processExecute: boolean;
  network: boolean;
  git: boolean;
  shell: boolean;
  maxConcurrent?: number;
  maxExecutionTime?: number;
}
```

### Capabilities by Runtime

| Capability | Local | Docker | WSL | SSH |
|------------|-------|--------|-----|-----|
| filesystemRead | ✅ | ✅ | ✅ | ✅ |
| filesystemWrite | ✅ | ✅ | ✅ | ✅ |
| processExecute | ✅ | ✅ | ✅ | ✅ |
| network | ✅ | ⚠️ | ✅ | ✅ |
| git | ✅ | ✅ | ✅ | ✅ |
| shell | ✅ | ✅ | ✅ | ✅ |

---

## Session Integration

```typescript
Session A
  ├── Provider: Gemini
  ├── Browser: Chrome
  ├── Runtime: Docker    ← Runtime Provider
  └── Workspace: project-a

Session B
  ├── Provider: ChatGPT
  ├── Browser: Chrome
  ├── Runtime: SSH       ← Runtime Provider
  └── Workspace: project-b
```

Runtime — часть SessionContext.

Каждый Tool execution использует `session.runtimeId`.

---

## Workspace Mapping

| Runtime | Host Path | Runtime Path |
|---------|-----------|--------------|
| Local | C:/projects/app | C:/projects/app |
| Docker | C:/projects/app | /workspace |
| WSL | C:/projects/app | /mnt/c/projects/app |
| SSH | C:/projects/app | /home/user/app |

Tool работает с логическим Workspace.
Runtime Provider отвечает за physical mapping.

---

## Tool Execution Pipeline

```
Tool
  ↓
Permission Engine
  ↓
Runtime Provider
  ↓
Execution
```

**Никогда:**
```
AI → Runtime → shell
```

**Правильно:**
```
AI → Tool → Permission → Runtime → Process
```

---

## Security

### Path Security

```
workspace: /project

request: /project/src/index.ts  ✓ allowed
request: /etc/passwd            ✗ denied
```

Runtime проверяет workspace boundaries:
- `../` traversal
- Symlinks
- Absolute paths
- Platform-specific paths

### Process Security

```
AI → Tool → Permission → Runtime → Process
```

AI не получает прямой shell access.

### Environment Variables

Не передавать весь environment автоматически.
Использовать explicit allowlist.

### Secrets

Runtime Provider не раскрывает:
- API keys
- Tokens
- Cookies
- SSH credentials

---

## Runtime Lifecycle

```
discovered
  ↓
connecting
  ↓
connected
  ↓
ready
  ↓
degraded
  ↓
recovering
  ↓
disconnected
  ↓
destroyed
```

---

## Runtime Events

```
runtime.discovered
runtime.connected
runtime.ready
runtime.degraded
runtime.recovering
runtime.disconnected
runtime.destroyed

execution.started
execution.completed
execution.failed
execution.cancelled
```

---

## Resource Limits

```typescript
interface RuntimeCapabilities {
  maxConcurrent?: number;     // Max concurrent executions
  maxExecutionTime?: number;  // Max execution time in ms
}
```

Если лимит превышен:
- `EXECUTION_TIMEOUT` для timeout
- Resource limit error для concurrent

---

## Tests

### Conformance Suite

Каждый Runtime Provider проверяется:
- interface
- lifecycle
- health
- capabilities
- workspace
- execution
- filesystem
- process
- timeout
- cancellation
- errors
- isolation

### Test Matrix

| Test | Local | Docker | WSL | SSH |
|------|-------|--------|-----|-----|
| connect | ✅ | ✅ | ✅ | ✅ |
| health | ✅ | ✅ | ✅ | ✅ |
| filesystem | ✅ | ✅ | ✅ | ✅ |
| process | ✅ | ✅ | ✅ | ✅ |
| workspace | ✅ | ✅ | ✅ | ✅ |
| permissions | ✅ | ✅ | ✅ | ✅ |
| timeouts | ✅ | ✅ | ✅ | ✅ |
| isolation | ✅ | ✅ | ✅ | ✅ |

---

## E2E

```
OpenCode
  ↓
BAB API
  ↓
Session
  ↓
Provider
  ↓
AI
  ↓
Tool
  ↓
Permission Engine
  ↓
Runtime Provider
  ↓
Workspace
  ↓
Execution
  ↓
Tool Result
  ↓
AI
  ↓
Response
```

---

## Ссылки

- [RuntimeProvider Interface](../packages/runtime/src/runtime-provider.ts)
- [LocalRuntimeProvider](../packages/runtime/src/local-runtime.ts)
- [DockerRuntimeProvider](../packages/runtime/src/docker-runtime.ts)
- [WSLRuntimeProvider](../packages/runtime/src/remote-runtime.ts)
- [SSHRuntimeProvider](../packages/runtime/src/remote-runtime.ts)
- [Session Fabric](./session-fabric.md)
