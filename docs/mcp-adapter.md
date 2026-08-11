# MCP Adapter — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-11  
> Status: Accepted

---

## Главный принцип

```
MCP НЕ становится внутренним фундаментом BAB.
```

BAB сохраняет собственные:
- Tool Protocol
- Capability System
- Permission Engine
- Provider Contract
- Runtime
- Session Model

MCP используется как **Adapter**.

---

## Архитектура

### MCP → BAB

```
External MCP Client
        │
        ▼
   MCP Adapter
        │
        ▼
  BAB Tool Model
        │
        ▼
Capability Resolver
        │
        ▼
Permission Engine
        │
        ▼
      Runtime
```

### BAB → MCP

```
BAB Tool
   │
   ▼
MCP Adapter
   │
   ▼
External MCP Client
```

---

## MCP Client Adapter

Подключение к внешнему MCP серверу:

```typescript
import { MCPClientAdapter } from '@bab/mcp-adapter';

const adapter = new MCPClientAdapter();

// Connect to MCP server
const identity = await adapter.connect({
  serverId: 'github',
  name: 'GitHub MCP',
  transport: 'stdio',
  connection: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: '...' },
  },
  enabled: true,
});

// Get tools as BAB tools
const tools = adapter.getTools();
// tools[0].name = 'mcp.github.create_issue'
// tools[0].description = 'Create an issue [MCP: GitHub MCP]'
// tools[0].requirements = { runtimeCapabilities: ['mcp'] }
```

---

## MCP Tool Mapping

### Namespace Format

```
mcp.<serverId>.<toolName>
```

Examples:
- `mcp.github.create_issue`
- `mcp.filesystem.read_file`
- `mcp.postgres.query`

### Mapping Table

| MCP Tool | BAB Tool |
|----------|----------|
| name | namespaced name |
| description | description + metadata |
| inputSchema | parameters |
| annotations | requirements |
| metadata | metadata |

### Metadata

```typescript
{
  source: 'mcp',
  serverId: 'github',
  serverName: 'GitHub MCP',
  originalToolName: 'create_issue',
  namespacedName: 'mcp.github.create_issue',
}
```

---

## Capability Negotiation

MCP Tool НЕ автоматически становится available:

```
MCP Tool
  ↓
Tool Requirements
  ↓
Provider Capabilities
  +
Runtime Capabilities
  +
User Permissions
  ↓
Capability Resolver
  ↓
Tool Negotiator
  ↓
Available / Denied / Confirmation Required
```

### Requirements

```typescript
{
  runtimeCapabilities: ['mcp'],
  permissions: ['mcp.write'],  // if destructive
}
```

---

## Security Boundary

MCP server — внешний источник, которому нельзя автоматически доверять.

### Угрозы

- Malicious tool descriptions
- Prompt injection
- Unexpected tool arguments
- Attempts to access forbidden resources
- Excessive permissions
- Network/filesystem/command access

### Защита

```
MCP Server
  ↓
Request
  ↓
BAB Permission Engine
  ↓
Authorization
  ↓
Execution
```

MCP Adapter НЕ автоматически выдаёт capabilities.

---

## Tool Namespace

Предотвращение collisions:

| Source | Namespace | Example |
|--------|-----------|---------|
| BAB | `bab.*` | `bab.git.status` |
| MCP | `mcp.*` | `mcp.github.create_issue` |
| Plugin | `plugin.*` | `plugin.example.search` |

---

## MCP Server Identity

```typescript
interface MCPServerIdentity {
  serverId: string;
  name: string;
  version?: string;
  transport: 'stdio' | 'sse' | 'websocket' | 'http';
  source: string;
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

---

## Lifecycle

```
discover
  ↓
connect
  ↓
initialize
  ↓
list tools
  ↓
register tools
  ↓
health
  ↓
reconnect
  ↓
disconnect
```

### Recovery

```
MCP unavailable
  ↓
Tools unavailable
  ↓
Capability state changes
  ↓
Tool Negotiator recalculates
```

---

## Tool Execution

```
AI
  ↓
Tool Call
  ↓
Tool Registry
  ↓
MCP Adapter
  ↓
MCP Server
  ↓
Tool Result
  ↓
BAB
  ↓
AI
```

Перед execution повторно проверяется:
- Session
- Capability
- Permission
- MCP server state

---

## Error Normalization

| MCP Error | BAB Error Code |
|-----------|----------------|
| Connection failed | `NETWORK_ERROR` |
| Server unavailable | `TOOL_UNAVAILABLE` |
| Request timeout | `TIMEOUT` |
| Permission problem | `PERMISSION_DENIED` |

---

## Observability

Каждое MCP действие имеет:
- `trace_id`
- `session_id`
- `tool_call_id`
- `server_id`

В AI Debugger:

```
AI → Tool Call → MCP Adapter → MCP Server → Result
```

---

## CLI Commands

```bash
bab mcp list              # List MCP servers
bab mcp inspect <server>  # Inspect server
bab mcp tools <server>    # List tools
bab mcp doctor            # Check MCP setup
```

---

## Configuration

```json
{
  "mcpServers": {
    "github": {
      "serverId": "github",
      "name": "GitHub MCP",
      "transport": "stdio",
      "connection": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": { "GITHUB_TOKEN": "..." }
      },
      "enabled": true,
      "permissions": {
        "allowedTools": ["mcp.github.*"],
        "confirmTools": ["mcp.github.delete_*"]
      }
    }
  }
}
```

**Не хранить секреты в конфиге.** Использовать credential boundary.

---

## Тесты

- MCP server discovery
- Connection
- Initialization
- Tool discovery
- Tool mapping
- Namespace
- Capability negotiation
- Permission allow/deny/confirm
- Disconnect/reconnect
- Timeout
- Malformed response
- Malicious metadata
- Trace correlation
- Recording/replay
- Security boundary

---

## Ссылки

- [MCP Adapter](../packages/mcp-adapter/src/client-adapter.ts)
- [Tool Mapper](../packages/mcp-adapter/src/tool-mapper.ts)
- [Types](../packages/mcp-adapter/src/types.ts)
- [Tool Protocol](../packages/protocol/src/types/tool.ts)
- [Capability Resolver](../packages/protocol/src/capability-resolver.ts)
- [Tool Negotiation](../packages/protocol/src/tool-negotiation.ts)
