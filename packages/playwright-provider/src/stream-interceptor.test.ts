import { describe, it, expect } from 'vitest';
import { CdpTokenStream } from './stream-interceptor.js';
import { DeepSeekStreamParser, ProviderBlockError } from './stream-parsers.js';
import type { NetworkCaptureChunk } from './cdp-client.js';

function fakeCapture(chunks: NetworkCaptureChunk[], signal?: { cancelled: boolean }) {
  return {
    cancelled: false,
    cancel() {
      this.cancelled = true;
      signal && (signal.cancelled = true);
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        if (this.cancelled) return;
        yield chunk;
      }
    },
  };
}

function chunk(text: string, status = 200): NetworkCaptureChunk {
  return { requestId: '1', url: 'https://example.com/chat/completion', text, status };
}

describe('CdpTokenStream', () => {
  it('buffers split SSE lines and parses each event', async () => {
    const capture = fakeCapture([
      chunk('data: {"choices":[{"delta":{"content":"he'),
      chunk('llo"}}]}\ndata: {"choices":[{"delta":{"content":" world"}}]}\ndata: [DONE]\n\n'),
    ]);
    const stream = new CdpTokenStream(capture, new DeepSeekStreamParser());

    const tokens: string[] = [];
    for await (const token of stream.tokens()) {
      tokens.push(token);
    }

    expect(tokens).toEqual(['hello', ' world']);
    expect(stream.isFinished).toBe(true);
  });

  it('raises ProviderBlockError on a rate-limited response', async () => {
    const capture = fakeCapture([
      { requestId: '1', url: 'https://example.com/chat/completion', text: 'x', status: 429 },
    ]);
    const stream = new CdpTokenStream(capture, new DeepSeekStreamParser());

    await expect(stream.take(200)).rejects.toThrow(ProviderBlockError);
  });

  it('collect returns the full text once the stream finishes', async () => {
    const capture = fakeCapture([
      chunk('data: {"choices":[{"delta":{"content":"hel'),
      chunk('lo"}}]}\n\ndata: [DONE]\n\n'),
    ]);
    const stream = new CdpTokenStream(capture, new DeepSeekStreamParser());

    expect(await stream.collect(1000)).toBe('hello');
  });

  it('collect returns null when the stream never finishes', async () => {
    const capture = {
      cancel() {},
      async *[Symbol.asyncIterator]() {
        // Never yields, never completes.
        await new Promise<void>(() => {});
      },
    };
    const stream = new CdpTokenStream(capture, new DeepSeekStreamParser());

    expect(await stream.collect(50)).toBeNull();
  });
});
