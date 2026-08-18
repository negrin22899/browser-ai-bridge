import type { CDPSession, Page } from 'playwright-core';

export interface NetworkCaptureChunk {
  requestId: string;
  url: string;
  text: string;
}

/**
 * Chrome DevTools Protocol client.
 *
 * The key capability for response hardening is `captureStream`: it observes
 * `Network.*` events and yields decoded text chunks for any response whose URL
 * matches one of the given patterns. This is the foundation for intercepting
 * the provider's own SSE stream (real tokens) instead of scraping the DOM.
 */
export class CDPClient {
  private session: CDPSession | null = null;

  constructor(session?: CDPSession) {
    this.session = session ?? null;
  }

  async attach(page: Page): Promise<void> {
    this.session = await page.context().newCDPSession(page);
  }

  attachSession(session: CDPSession): void {
    this.session = session;
  }

  async detach(): Promise<void> {
    if (this.session) {
      try {
        await this.session.detach();
      } catch {
        // Ignore detach errors.
      }
      this.session = null;
    }
  }

  async evaluate(expression: string): Promise<unknown> {
    if (!this.session) throw new Error('Not attached');
    const result = await this.session.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    return (result as { result?: { value?: unknown } }).result?.value;
  }

  captureStream(patterns: string[]): NetworkCaptureStream {
    if (!this.session) throw new Error('Not attached');
    return new NetworkCaptureStream(this.session, patterns);
  }
}

export class NetworkCaptureStream implements AsyncIterable<NetworkCaptureChunk> {
  private queue: NetworkCaptureChunk[] = [];
  private requests = new Map<string, string>(); // requestId -> url
  private matchers: RegExp[];
  private cancelled = false;
  private waiter: (() => void) | null = null;

  constructor(private session: CDPSession, patterns: string[]) {
    this.matchers = patterns.map((p) => new RegExp(p));
  }

  cancel(): void {
    this.cancelled = true;
    this.waiter?.();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<NetworkCaptureChunk> {
    const matches = (url: string) => this.matchers.some((re) => re.test(url));

    const onResponseReceived = (event: {
      requestId: string;
      response?: { url?: string };
    }) => {
      const url = event.response?.url ?? '';
      if (!matches(url)) return;
      this.requests.set(event.requestId, url);
    };

    const onDataReceived = (event: {
      requestId: string;
      data?: string;
    }) => {
      const url = this.requests.get(event.requestId);
      if (url === undefined || !event.data) return;

      let text: string;
      try {
        text = Buffer.from(event.data, 'base64').toString('utf-8');
      } catch {
        text = event.data;
      }

      this.queue.push({ requestId: event.requestId, url, text });
      this.waiter?.();
    };

    const onLoadingFinished = (event: { requestId: string }) => {
      this.requests.delete(event.requestId);
    };

    const offs: Array<() => void> = [
      () => this.session.off('Network.responseReceived', onResponseReceived as never),
      () => this.session.off('Network.dataReceived', onDataReceived as never),
      () => this.session.off('Network.loadingFinished', onLoadingFinished as never),
    ];

    this.session.on('Network.responseReceived', onResponseReceived as never);
    this.session.on('Network.dataReceived', onDataReceived as never);
    this.session.on('Network.loadingFinished', onLoadingFinished as never);

    try {
      await this.session.send('Network.enable');

      while (!this.cancelled) {
        if (this.queue.length > 0) {
          yield this.queue.shift()!;
        } else {
          await new Promise<void>((resolve) => {
            this.waiter = resolve;
          });
        }
      }
    } finally {
      this.cancelled = true;
      for (const off of offs) off();
    }
  }
}
