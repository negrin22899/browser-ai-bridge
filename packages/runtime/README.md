# @bab/runtime

Runtime Engine for Browser AI Bridge - manages tool execution, permissions, and audit logging.

## Architecture

```
Runtime
├── ToolDispatcher      - Registers and executes tools
├── PermissionEngine    - Scope-based access control
└── AuditLogger         - Logs all tool executions
```

## Usage

```typescript
import { Runtime } from '@bab/runtime';
import { EventBus } from '@bab/core';
import { FsReadTool } from '@bab/tools-fs';

const eventBus = new EventBus();
const runtime = new Runtime(eventBus, {
  workingDirectory: '/home/user/projects',
  permissions: {
    mode: 'scope',
    defaultScope: {
      allowedPaths: ['/home/user/projects'],
      allowedCommands: ['git status', 'git diff'],
      deniedCommands: ['rm -rf', 'sudo'],
      maxExecutionTime: 30000,
    },
    dangerousTools: ['shell.exec'],
  },
  audit: {
    enabled: true,
    maxEntries: 1000,
  },
});

// Register tools
runtime.tools.register(new FsReadTool());

// Start runtime
await runtime.start();

// Grant permission
runtime.grantPermission('fs.read', defaultScope, 'session-1');

// Execute tool
const result = await runtime.executeTool(
  'fs.read',
  { path: 'package.json' },
  'session-1'
);

// Check audit log
const entries = runtime.getAuditLog('session-1');

// Stop runtime
await runtime.stop();
```

## Permission Model

### Scope-based Permissions

Each tool execution is checked against:
1. **Dangerous tools** - Always require explicit confirmation
2. **Granted permissions** - Tool must be granted for the session
3. **Scope validation** - Path/command must be within allowed scope

### Tool Scope

```typescript
interface ToolScope {
  allowedPaths: string[];      // Allowed file paths
  allowedCommands: string[];   // Allowed shell commands
  deniedCommands: string[];    // Denied shell commands
  maxExecutionTime: number;    // Max execution time in ms
}
```

## Audit Logging

All tool executions are logged with:
- Timestamp
- Session ID
- Tool name
- Parameters
- Result (allowed/denied/error)
- Reason (if denied)

## Events

The runtime emits events via EventBus:

| Event | Data | Description |
|-------|------|-------------|
| `tool.requested` | `{ toolName, params, sessionId }` | Tool execution requested |
| `tool.executing` | `{ toolName, sessionId }` | Tool execution started |
| `tool.completed` | `{ toolName, result, sessionId }` | Tool execution completed |
| `tool.error` | `{ toolName, error, sessionId }` | Tool execution failed |
| `permission.requested` | `{ toolName, sessionId }` | Permission check requested |
| `permission.granted` | `{ toolName, sessionId }` | Permission granted |
| `permission.denied` | `{ toolName, sessionId }` | Permission denied |

## Tests

```bash
npm test -w @bab/runtime
```

40 tests covering:
- Runtime lifecycle (start/stop)
- Tool registration and execution
- Permission management
- Scope validation
- Audit logging
- Event emission
