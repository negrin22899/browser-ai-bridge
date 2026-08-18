import { describe, it, expect, vi } from 'vitest';
import {
  runToolLoop,
  runToolLoopStream,
  extractToolCalls,
  parseActionsJson,
} from './tool-loop.js';
import type { Logger } from '@bab/core';
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Provider,
} from '@bab/protocol';
import type { Runtime } from '@bab/runtime';

function makeLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;
}

function makeRuntime(handler: (name: string, params: Record<string, unknown>) => unknown): Runtime {
  return {
    executeTool: vi.fn(async (name: string, params: Record<string, unknown>) => {
      const result = handler(name, params);
      if (result && typeof result === 'object') return result;
      return { success: true, output: String(result) };
    }),
  } as unknown as Runtime;
}

function makeProvider(responses: ChatCompletionResponse[]): Provider {
  let index = 0;
  return {
    id: 'mock',
    name: 'Mock',
    type: 'api',
    status: 'connected',
    async send(): Promise<ChatCompletionResponse> {
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return response;
    },
    async *stream() {},
    async connect() {},
    async disconnect() {},
    async health() {
      return { healthy: true };
    },
    getCapabilities() {
      return {};
    },
    cancel() {},
  } as unknown as Provider;
}

describe('parseActionsJson', () => {
  it('parses plain actions object', () => {
    const actions = parseActionsJson('{"actions":[{"id":"a1","tool":"fs.read","params":{"path":"x"}}]}');
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('fs.read');
  });

  it('parses markdown-fenced JSON', () => {
    const actions = parseActionsJson('Sure:\n```json\n{"actions":[{"tool":"git.status"}]}\n```');
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('git.status');
  });

  it('returns empty array for prose without actions', () => {
    expect(parseActionsJson('Here is the answer.')).toEqual([]);
  });
});

describe('extractToolCalls', () => {
  it('uses OpenAI tool_calls when present', () => {
    const calls = extractToolCalls({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call-1',
          type: 'function',
          function: { name: 'fs.read', arguments: '{"path":"package.json"}' },
        },
      ],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('fs.read');
  });

  it('falls back to actions JSON in content', () => {
    const calls = extractToolCalls({
      role: 'assistant',
      content: '{"actions":[{"tool":"git.diff","params":{}}]}',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('git.diff');
  });
});

describe('runToolLoop', () => {
  it('executes tool calls and returns the final answer', async () => {
    const executed: Array<{ name: string; params: Record<string, unknown> }> = [];

    const provider = makeProvider([
      {
        id: 'resp-1',
        object: 'chat.completion',
        created: 1,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'fs.read', arguments: '{"path":"package.json"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
      {
        id: 'resp-2',
        object: 'chat.completion',
        created: 2,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Done!' },
            finish_reason: 'stop',
          },
        ],
      },
    ]);

    const runtime = makeRuntime((name, params) => {
      executed.push({ name, params });
      return { success: true, output: '{"name":"browser-ai-bridge"}' };
    });

    const recorded: Array<{ role: string; content: string | null }> = [];
    const response = await runToolLoop(provider, runtime, makeLogger(), {
      model: 'mock',
      messages: [{ role: 'user', content: 'Read package.json' }],
    }, 'session-1', { onMessage: (m) => recorded.push(m) });

    expect(executed).toHaveLength(1);
    expect(executed[0].name).toBe('fs.read');
    expect(executed[0].params).toEqual({ path: 'package.json' });
    expect(response.choices[0].message.content).toBe('Done!');
    expect(recorded.some((m) => m.content && m.content.includes('results'))).toBe(true);
  });
});

describe('runToolLoopStream', () => {
  it('streams the final answer after executing tool calls', async () => {
    const executed: Array<{ name: string; params: Record<string, unknown> }> = [];

    const provider = makeProvider([
      {
        id: 'resp-1',
        object: 'chat.completion',
        created: 1,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'fs.read', arguments: '{"path":"package.json"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
      {
        id: 'resp-2',
        object: 'chat.completion',
        created: 2,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Streamed final answer' },
            finish_reason: 'stop',
          },
        ],
      },
    ]);

    const runtime = makeRuntime((name, params) => {
      executed.push({ name, params });
      return { success: true, output: 'ok' };
    });

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of runToolLoopStream(
      provider,
      runtime,
      makeLogger(),
      { model: 'mock', messages: [{ role: 'user', content: 'Read package.json' }] },
      'session-1'
    )) {
      chunks.push(chunk);
    }

    const content = chunks
      .map((c) => c.choices[0]?.delta?.content ?? '')
      .join('');

    expect(executed).toHaveLength(1);
    expect(executed[0].name).toBe('fs.read');
    expect(content).toBe('Streamed final answer');
    expect(chunks[0].choices[0].delta.role).toBe('assistant');
    expect(chunks[chunks.length - 1].choices[0].finish_reason).toBe('stop');
  });
});

describe('runToolLoop', () => {
  it('returns the response unchanged when there are no tool calls', async () => {
    const provider = makeProvider([
      {
        id: 'resp-1',
        object: 'chat.completion',
        created: 1,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'No tools needed' },
            finish_reason: 'stop',
          },
        ],
      },
    ]);

    const runtime = makeRuntime(() => {
      throw new Error('should not execute');
    });

    const response = await runToolLoop(provider, runtime, makeLogger(), {
      model: 'mock',
      messages: [{ role: 'user', content: 'Hello' }],
    }, 'session-1');

    expect(response.choices[0].message.content).toBe('No tools needed');
  });
});
