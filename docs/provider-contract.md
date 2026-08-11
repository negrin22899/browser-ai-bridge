# Provider Contract — Browser AI Bridge

> Version: 2.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Что должен реализовать разработчик, чтобы добавить новый Provider?

### Unified Provider Interface

Все провайдеры реализуют один контракт:

```typescript
interface Provider {
  // Metadata (readonly)
  readonly metadata: ProviderMetadata;
  
  // State
  readonly state: ProviderStateInfo;
  
  // Lifecycle
  discover?(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Health
  health(): Promise<ProviderHealth>;
  
  // Capabilities
  getCapabilities(): ProviderCapabilities;
  hasCapability(name: string): boolean;
  
  // Communication
  send(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  cancel(): void;
  
  // Tools
  getTools?(): ToolDescription[];
  setTools?(tools: ToolDescription[]): void;
}
```

---

## Шаги для создания нового Provider

### 1. Создать Plugin Structure

```
plugins/provider-example/
├── package.json
├── tsconfig.json
└── src/
    ├── provider.ts      # Provider implementation
    ├── adapter.ts       # Browser/API adapter
    └── index.ts         # Plugin entry
```

### 2. Реализовать ProviderMetadata

```typescript
const metadata: ProviderMetadata = {
  id: 'example',
  name: 'Example AI',
  version: '1.0.0',
  type: 'browser',        // или 'api', 'local'
  transport: 'playwright', // или 'cdp', 'http', 'websocket'
  supportedModels: ['example-1', 'example-2'],
  description: 'Example AI provider',
};
```

### 3. Реализовать State Management

```typescript
private _state: ProviderStateInfo = {
  state: 'discovered',
  timestamp: Date.now(),
  duration: 0,
};

get state(): ProviderStateInfo {
  return {
    ...this._state,
    duration: Date.now() - this._state.timestamp,
  };
}
```

### 4. Реализовать Capabilities

```typescript
getCapabilities(): ProviderCapabilities {
  return {
    streaming: true,
    images: false,
    files: false,
    thinking: true,
    toolCalling: false,
    webSearch: false,
    markdown: true,
    codeGeneration: true,
    multiModal: false,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
  };
}

hasCapability(name: string): boolean {
  const caps = this.getCapabilities();
  return caps[name as keyof ProviderCapabilities] === true;
}
```

### 5. Реализовать Health Check

```typescript
async health(): Promise<ProviderHealth> {
  return {
    healthy: this._state.state === 'connected',
    connection: {
      connected: this._state.state === 'connected',
      quality: 'good',
      uptime: Date.now() - this._startTime,
    },
    latency: {
      current: this._lastLatency,
      average: this._avgLatency,
      p95: this._p95Latency,
      last: this._lastLatency,
    },
    capabilities: {
      available: Object.entries(this.getCapabilities())
        .filter(([_, v]) => v === true)
        .map(([k]) => k),
      degraded: [],
      unavailable: [],
    },
  };
}
```

### 6. Реализовать Error Handling

```typescript
import { createProviderError } from '@bab/protocol';

try {
  // ... provider logic
} catch (error) {
  const providerError = createProviderError(
    'AUTH_REQUIRED',
    'Not signed in to Example AI',
    {
      original: error,
      recoverable: true,
      recovery: 'Run: bab connect example',
    }
  );
  
  this._state = {
    state: 'error',
    timestamp: Date.now(),
    duration: 0,
    error: providerError,
  };
  
  throw providerError;
}
```

### 7. Создать Plugin Entry

```typescript
import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { ExampleProvider } from './provider.js';

const plugin: Plugin = {
  manifest: {
    name: 'provider-example',
    version: '1.0.0',
    description: 'Example AI provider',
    provides: {
      providers: [{
        id: 'example',
        name: 'Example AI',
        type: 'browser',
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    const provider = new ExampleProvider();
    context.registerProvider(provider);
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

export default plugin;
```

---

## Что НЕ нужно менять

Добавление нового Provider **не требует** изменений:

- ❌ Core Runtime
- ❌ Bridge Protocol
- ❌ Permission Engine
- ❌ Session Manager
- ❌ API Server

Нужно только:

- ✅ Создать Plugin Provider
- ✅ Написать тесты
- ✅ Запустить Conformance Tests

---

## Conformance Tests

Каждый Provider должен пройти:

```typescript
import { testProviderConformance, printConformanceReport } from '@bab/protocol';

const provider = new MyProvider();
const report = await testProviderConformance(provider);
printConformanceReport(report);
```

Тесты проверяют:
- Interface compliance
- Metadata validity
- Capabilities structure
- Health check structure
- Lifecycle (connect/disconnect)
- Communication (send/stream)
- Error handling

---

## Error Codes

| Код | Описание | Recoverable |
|-----|----------|-------------|
| AUTH_REQUIRED | Не авторизован | Да |
| BROWSER_UNAVAILABLE | Браузер недоступен | Да |
| PAGE_NOT_FOUND | Страница не загружена | Да |
| UI_CHANGED | UI изменился | Да |
| NETWORK_ERROR | Ошибка сети | Да |
| TIMEOUT | Таймаут | Да |
| RATE_LIMITED | Превышен лимит | Да |
| PROVIDER_ERROR | Ошибка провайдера | Нет |
| CAPABILITY_UNAVAILABLE | Capability недоступна | Нет |
| SESSION_EXPIRED | Сессия истекла | Да |
| REQUEST_CANCELLED | Запрос отменён | Нет |
| UNKNOWN | Неизвестная ошибка | Нет |

---

## Capability Negotiation

Runtime проверяет capabilities перед выполнением:

```typescript
const resolver = new CapabilityResolver();
const result = resolver.resolve({
  userPermissions: { allowed: ['read', 'write'], denied: [], confirm: ['execute'] },
  providerCapabilities: provider.getCapabilities(),
  runtimeCapabilities: { features: ['filesystem', 'git'], tools: ['fs.read'], integrations: [] },
  toolRequirements: new Map([
    ['fs.read', { required: ['files'] }],
    ['fs.write', { required: ['files'] }],
  ]),
});

// result.availableTools = ['fs.read', 'fs.write']
// result.deniedTools = []
```

---

## Graceful Degradation

Если Provider временно потерял capability:

```typescript
// Provider сообщает о degraded state
this._state = {
  state: 'degraded',
  timestamp: Date.now(),
  duration: 0,
};

// Capabilities обновляются
getCapabilities(): ProviderCapabilities {
  return {
    ...DEFAULT_CAPABILITIES,
    streaming: false, // Временно недоступно
    markdown: true,
  };
}
```

Runtime понимает:
- streaming = unavailable
- normal request = available

---

## Примеры

Смотрите существующие провайдеры:
- `plugins/provider-gemini/` — Browser provider
- `plugins/provider-chatgpt/` — Browser provider
- `plugins/provider-claude/` — Browser provider
- `plugins/provider-deepseek/` — Browser provider

---

## Ссылки

- [Provider Types](../packages/protocol/src/types/provider-v2.ts)
- [Capability Resolver](../packages/protocol/src/capability-resolver.ts)
- [Conformance Tests](../packages/protocol/src/conformance-test.ts)
- [Plugin SDK](./plugin-sdk.md)
