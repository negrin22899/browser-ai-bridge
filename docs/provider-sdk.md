# Provider SDK Guide

> Build an AI Provider plugin for Browser AI Bridge in one evening.

## Overview

A Provider connects Browser AI Bridge to an AI service (Gemini, ChatGPT, Claude, etc.). The Provider interface is simple:

```typescript
interface Provider {
  readonly id: string;
  readonly name: string;
  readonly type: 'browser' | 'api' | 'local';
  readonly status: ProviderStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  health(): Promise<HealthCheckResult>;
  getCapabilities(): ProviderCapabilities;
  cancel(): void;
}
```

## Quick Start

### 1. Create Plugin Structure

```
plugins/provider-myai/
├── package.json
├── tsconfig.json
└── src/
    ├── provider.ts
    └── index.ts
```

### 2. Implement Provider

```typescript
// src/provider.ts

import type {
  Provider,
  ProviderStatus,
  ProviderCapabilities,
  HealthCheckResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@bab/protocol';

export class MyAIProvider implements Provider {
  readonly id = 'myai';
  readonly name = 'My AI';
  readonly type = 'api' as const;

  private _status: ProviderStatus = 'disconnected';

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = 'connecting';
    // Connect to your AI service
    this._status = 'connected';
  }

  async disconnect(): Promise<void> {
    // Cleanup
    this._status = 'disconnected';
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this._status = 'busy';

    const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

    // Call your AI service
    const response = await callMyAI(userMessage);

    this._status = 'connected';

    return {
      id: `myai-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: response },
        finish_reason: 'stop',
      }],
    };
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    // For non-streaming providers, wrap send() as stream
    const response = await this.send(request);

    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: response.choices[0].message,
        finish_reason: null,
      }],
    };

    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    };
  }

  async health(): Promise<HealthCheckResult> {
    return {
      healthy: this._status === 'connected',
      details: { status: this._status },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      images: false,
      files: false,
      thinking: false,
      toolCalling: false,
      webSearch: false,
      markdown: true,
      codeGeneration: true,
      multiModal: false,
    };
  }

  cancel(): void {
    // Cancel current request if possible
  }
}
```

### 3. Create Plugin Entry

```typescript
// src/index.ts

import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { MyAIProvider } from './provider.js';

const myaiPlugin: Plugin = {
  manifest: {
    name: 'provider-myai',
    version: '1.0.0',
    description: 'My AI provider',
    provides: {
      providers: [{
        id: 'myai',
        name: 'My AI',
        type: 'api',
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    const provider = new MyAIProvider();
    context.registerProvider(provider);
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

export default myaiPlugin;
```

### 4. Add package.json

```json
{
  "name": "@bab/provider-myai",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bab": {
    "name": "provider-myai",
    "version": "1.0.0",
    "description": "My AI provider",
    "provides": {
      "providers": [{
        "id": "myai",
        "name": "My AI",
        "type": "api"
      }]
    }
  },
  "dependencies": {
    "@bab/protocol": "*",
    "@bab/plugin-sdk": "*"
  }
}
```

### 5. Validate Your Provider

```typescript
import { validateProvider, printValidationReport } from '@bab/protocol';
import { MyAIProvider } from './provider.js';

const provider = new MyAIProvider();
const report = await validateProvider(provider);
printValidationReport(report);

// Output:
// ============================================================
// Provider Validation: My AI
// ============================================================
// Status: ✅ PASS
// Tests: 7/7 passed
// ------------------------------------------------------------
// ✅ interface               2ms
// ✅ capabilities             1ms
// ✅ health                   5ms
// ✅ connect                 150ms
// ✅ send                    520ms
// ✅ stream                  510ms
// ✅ disconnect               10ms
// ============================================================
```

## Provider Types

### Browser Provider
Uses Playwright to automate a browser-based AI.

```typescript
readonly type = 'browser';

// Use Playwright
import { chromium } from 'playwright-core';

async connect(): Promise<void> {
  this.browser = await chromium.launch();
  this.page = await this.browser.newPage();
  await this.page.goto('https://ai-service.com');
}
```

### API Provider
Calls an AI service via HTTP API.

```typescript
readonly type = 'api';

async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const response = await fetch('https://api.ai-service.com/v1/chat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${this.apiKey}` },
    body: JSON.stringify(request),
  });
  return response.json();
}
```

### Local Provider
Runs a local AI model.

```typescript
readonly type = 'local';

async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  // Call local model via Ollama, llama.cpp, etc.
  const response = await this.localModel.generate(request.messages);
  return formatResponse(response);
}
```

## Capabilities

Declare what your provider can do:

```typescript
getCapabilities(): ProviderCapabilities {
  return {
    streaming: true,      // Can stream responses
    images: true,         // Can handle images
    files: true,          // Can handle files
    thinking: true,       // Supports thinking/reasoning
    toolCalling: false,   // Does NOT support tool calling
    webSearch: true,      // Can search the web
    markdown: true,       // Supports markdown
    codeGeneration: true, // Can generate code
    multiModal: true,     // Supports multi-modal input
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
  };
}
```

## Error Handling

```typescript
async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  try {
    // ... call AI service
  } catch (error) {
    this._status = 'error';
    throw new Error(`Provider error: ${error.message}`);
  }
}

async health(): Promise<HealthCheckResult> {
  try {
    // Check if service is available
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyAIProvider } from './provider.js';

describe('MyAIProvider', () => {
  it('should implement Provider interface', () => {
    const provider = new MyAIProvider();
    expect(provider.id).toBe('myai');
    expect(provider.type).toBe('api');
  });

  it('should connect and send', async () => {
    const provider = new MyAIProvider();
    await provider.connect();
    expect(provider.status).toBe('connected');

    const response = await provider.send({
      model: 'myai',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response.choices[0].message.content).toBeDefined();
  });
});
```

## Publishing

1. Create your plugin directory in `plugins/`
2. Implement the Provider interface
3. Run validation suite
4. Submit PR to Browser AI Bridge

## Examples

See `plugins/provider-gemini/` for a complete browser-based provider example.

## Support

- GitHub Issues: [browser-ai-bridge/issues](https://github.com/browser-ai-bridge/issues)
- Discord: [browser-ai-bridge/discord](https://discord.gg/browser-ai-bridge)
