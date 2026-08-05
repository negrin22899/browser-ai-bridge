# Browser AI Bridge

**Open Runtime for AI Providers**

Use browser AI (Gemini, ChatGPT, Claude) in your local development environment.

```
OpenCode → Browser AI Bridge → Gemini → Browser → Your Files → Response
```

## Features

✔ **OpenAI Compatible API** — Works with OpenCode, Cursor, VS Code  
✔ **Plugin SDK** — Extend with custom providers and tools  
✔ **Runtime Engine** — Execute tools with permissions  
✔ **Permission System** — Auto/Confirm/Deny for safety  
✔ **Browser Providers** — Gemini, ChatGPT, Claude via Playwright  
✔ **Recording & Replay** — Debug AI interactions  

## Quick Start

```bash
# Install
npm install
npm run build

# Run doctor to check setup
node apps/cli/dist/index.js doctor

# Start with Gemini
node apps/cli/dist/index.js serve --site https://gemini.google.com
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your IDE (OpenCode)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ POST /v1/chat/completions
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Browser AI Bridge                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  API     │  │ Runtime  │  │ Permission│  │ Recorder │   │
│  │  Server  │  │  Engine  │  │  Engine   │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘   │
│       │              │              │                        │
│       └──────────────┼──────────────┘                        │
│                      │                                       │
│              ┌───────▼───────┐                               │
│              │  Plugin SDK   │                               │
│              └───────┬───────┘                               │
│                      │                                       │
│  ┌───────────────────┼───────────────────┐                  │
│  │                   │                   │                  │
│  ▼                   ▼                   ▼                  │
│ Gemini            ChatGPT             Claude               │
│ Plugin            Plugin              Plugin               │
└──────┬─────────────────┬─────────────────┬─────────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Playwright)                    │
│         gemini.google.com / chat.openai.com / claude.ai     │
└─────────────────────────────────────────────────────────────┘
```

## Examples

### Read a file

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Read package.json"}]
  }'
```

### Get git status

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Show git status"}]
  }'
```

## Plugins

### Create a Provider

```typescript
import type { Provider } from '@bab/protocol';

export class MyProvider implements Provider {
  readonly id = 'myai';
  readonly name = 'My AI';
  readonly type = 'api';

  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async send(request) { /* ... */ }
  async *stream(request) { /* ... */ }
  async health() { /* ... */ }
  getCapabilities() { /* ... */ }
  cancel() { /* ... */ }
}
```

### Create a Tool

```typescript
import type { Tool } from '@bab/protocol';

export class MyTool implements Tool {
  readonly name = 'mytool.action';
  readonly description = 'Does something useful';
  readonly parameters = { /* JSON Schema */ };

  async execute(params, context) {
    return { success: true, output: 'result' };
  }
}
```

See [Provider SDK Guide](./docs/provider-sdk.md) and [Tool SDK Guide](./docs/tool-sdk.md).

## CLI Commands

```bash
# Check system requirements
bab doctor

# Collect diagnostic info
bab diagnose

# Start API server
bab serve --site https://gemini.google.com

# Quick chat
bab chat "Read package.json"
```

## Dashboard

```bash
npm run dashboard
# Open http://localhost:5173
```

Features:
- Provider management
- Session history
- Runtime inspector
- Audit logs
- Settings

## Documentation

- [Provider SDK Guide](./docs/provider-sdk.md)
- [Tool SDK Guide](./docs/tool-sdk.md)
- [Plugin SDK Guide](./docs/plugin-sdk.md)
- [Architecture Decisions](./ARCHITECTURE_DECISIONS.md)
- [Known Limitations](./KNOWN_LIMITATIONS.md)
- [Roadmap](./docs/roadmap.md)

## Current Limitations

### v0.2-alpha

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Gemini only | Medium | ChatGPT/Claude planned for v0.3 |
| Requires Chrome | Medium | Firefox/Safari support planned |
| Manual login required | Low | User must be logged in to Gemini |
| No persistent sessions | Low | Re-login on restart |
| Limited streaming | Low | Full streaming in v0.3 |

### What Works

- ✅ OpenAI-compatible API (`/v1/chat/completions`, `/v1/responses`)
- ✅ Gemini Provider via Playwright
- ✅ File reading with permissions
- ✅ Git operations (status, diff, log)
- ✅ Runtime Inspector (real-time)
- ✅ Audit logging
- ✅ Plugin system

### What Doesn't Work Yet

- ❌ ChatGPT provider
- ❌ Claude provider
- ❌ DeepSeek provider
- ❌ Local models
- ❌ Persistent browser sessions
- ❌ Automatic re-login
- ❌ Multi-tab support

## Roadmap

| Version | Status | Description |
|---------|--------|-------------|
| v0.1 | ✅ | Foundation |
| v0.2 | 🔄 | First Working Provider |
| v0.3 | 🔲 | First External User |
| v0.4 | 🔲 | Stable Plugin SDK |
| v1.0 | 🔲 | Public Release |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT

---

**One provider that works flawlessly > Five providers with stubs.**
