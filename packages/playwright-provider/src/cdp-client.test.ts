import { describe, it, expect } from 'vitest';
import type { CDPSession } from 'playwright-core';
import { CDPClient, type NetworkCaptureChunk } from './cdp-client.js';

class FakeCDPSession {
  handlers = new Map<string, Set<(event: unknown) => void>>();
  sent: string[] = [];

  on(event: string, handler: (event: unknown) => void): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: (event: unknown) => void): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  async send(method: string): Promise<unknown> {
    this.sent.push(method);
    return {};
  }

  async detach(): Promise<void> {}

  emit(event: string, data: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(data);
    }
  }
}

function base64(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64');
}

describe('CDPClient', () => {
  it('captures decoded text chunks for matching URLs', async () => {
    const session = new FakeCDPSession();
    const client = new CDPClient(session as unknown as CDPSession);

    const chunks: NetworkCaptureChunk[] = [];
    const consuming = (async () => {
      for await (const chunk of client.captureStream(['stream\\.php'])) {
        chunks.push(chunk);
        if (chunks.length >= 2) break;
      }
    })();

    // Non-matching request must be ignored.
    session.emit('Network.responseReceived', {
      requestId: 'other',
      response: { url: 'https://example.com/api/normal' },
    });
    session.emit('Network.dataReceived', {
      requestId: 'other',
      data: base64('ignored'),
    });

    session.emit('Network.responseReceived', {
      requestId: 'r1',
      response: { url: 'https://example.com/stream.php' },
    });
    session.emit('Network.dataReceived', { requestId: 'r1', data: base64('hello ') });
    session.emit('Network.dataReceived', { requestId: 'r1', data: base64('world') });

    await consuming;

    expect(session.sent).toContain('Network.enable');
    expect(chunks.map((c) => c.text)).toEqual(['hello ', 'world']);
    expect(chunks[0].url).toBe('https://example.com/stream.php');
  });

  it('stops yielding after cancel', async () => {
    const session = new FakeCDPSession();
    const client = new CDPClient(session as unknown as CDPSession);

    const stream = client.captureStream(['stream']);
    const received: string[] = [];
    const consuming = (async () => {
      for await (const chunk of stream) {
        received.push(chunk.text);
      }
    })();

    session.emit('Network.responseReceived', {
      requestId: 'r1',
      response: { url: 'https://example.com/stream' },
    });
    session.emit('Network.dataReceived', { requestId: 'r1', data: base64('first') });

    // Give the generator a chance to yield the first chunk.
    await new Promise((r) => setTimeout(r, 0));

    stream.cancel();
    await consuming;

    expect(received).toEqual(['first']);
  });
});
