import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiProvider } from './api-provider.js';
import type { ChatCompletionRequest } from '@bab/protocol';

function openaiResponse() {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion',
    created: 1,
    model: 'gpt-4o',
    choices: [{ index: 0, message: { role: 'assistant', content: 'Hello from OpenAI' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
  };
}

function anthropicResponse() {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello from Claude' }],
    model: 'claude-3-5-sonnet',
    stop_reason: 'end_turn',
    usage: { input_tokens: 5, output_tokens: 4 },
  };
}

function googleResponse() {
  return {
    candidates: [{
      content: { parts: [{ text: 'Hello from Gemini' }], role: 'model' },
      finishReason: 'STOP',
    }],
    usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4, totalTokenCount: 9 },
  };
}

const baseRequest: ChatCompletionRequest = {
  model: 'test-model',
  messages: [{ role: 'user', content: 'hi' }],
};

describe('ApiProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves the API key from options', () => {
    const provider = new ApiProvider({ id: 'openai', format: 'openai', apiKey: 'sk-test' });
    expect(provider.status).toBe('disconnected');
  });

  it('fails to connect without an API key', async () => {
    const provider = new ApiProvider({ id: 'openai', format: 'openai' });
    await expect(provider.connect()).rejects.toThrow(/No API key/);
  });

  it('sends an OpenAI-compatible request with a Bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(openaiResponse()), { status: 200 }));
    const provider = new ApiProvider({ id: 'openai', format: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1' });
    await provider.connect();

    const response = await provider.send(baseRequest);
    expect(response.choices[0].message.content).toBe('Hello from OpenAI');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('parses an Anthropic response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(anthropicResponse()), { status: 200 }));
    const provider = new ApiProvider({ id: 'claude', format: 'anthropic', apiKey: 'ak-test' });
    await provider.connect();

    const response = await provider.send(baseRequest);
    expect(response.choices[0].message.content).toBe('Hello from Claude');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['x-api-key']).toBe('ak-test');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
  });

  it('parses a Google response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(googleResponse()), { status: 200 }));
    const provider = new ApiProvider({ id: 'gemini', format: 'google', apiKey: 'g-test', model: 'gemini-pro' });
    await provider.connect();

    const response = await provider.send(baseRequest);
    expect(response.choices[0].message.content).toBe('Hello from Gemini');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/models/gemini-pro:generateContent');
  });

  it('streams OpenAI SSE deltas', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
      '',
    ].join('\n\n');
    fetchMock.mockResolvedValue(new Response(sse, { status: 200 }));

    const provider = new ApiProvider({ id: 'openai', format: 'openai', apiKey: 'sk-test' });
    await provider.connect();

    const chunks: string[] = [];
    let finish: string | null = null;
    for await (const chunk of provider.stream(baseRequest)) {
      chunks.push(chunk.choices[0].delta.content ?? '');
      finish = chunk.choices[0].finish_reason;
    }

    expect(chunks.join('')).toBe('Hello world');
    expect(finish).toBe('stop');
  });

  it('streams Anthropic content_block_delta events', async () => {
    const sse = [
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');
    fetchMock.mockResolvedValue(new Response(sse, { status: 200 }));

    const provider = new ApiProvider({ id: 'claude', format: 'anthropic', apiKey: 'ak-test' });
    await provider.connect();

    const chunks: string[] = [];
    for await (const chunk of provider.stream(baseRequest)) {
      chunks.push(chunk.choices[0].delta.content ?? '');
    }

    expect(chunks.join('')).toBe('Hi');
  });

  it('surfaces an API error message', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":{"message":"invalid key"}}', { status: 401 }));
    const provider = new ApiProvider({ id: 'openai', format: 'openai', apiKey: 'bad' });
    await provider.connect();

    await expect(provider.send(baseRequest)).rejects.toThrow(/401/);
    expect(provider.status).toBe('error');
  });
});
