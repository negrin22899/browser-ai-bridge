import type { NetworkCaptureChunk } from './cdp-client.js';
import {
  detectBlockError,
  ProviderBlockError,
  ProviderStreamError,
  type StreamEventParser,
} from './stream-parsers.js';

/**
 * Consumes raw network chunks captured via CDP, splits them into SSE lines and
 * parses them into text tokens using a provider-specific parser. Also raises
 * ProviderBlockError when the provider answers with an auth/rate-limit/CAPTCHA
 * response.
 *
 * Consumers either `take()` tokens with a timeout (to detect "nothing came
 * through") or `collect()` the full text once the stream finishes.
 */
export class CdpTokenStream {
  private queue: string[] = [];
  private finished = false;
  private error: Error | null = null;
  private waiter: (() => void) | null = null;

  constructor(
    private capture: AsyncIterable<NetworkCaptureChunk> & { cancel?: () => void },
    private parser: StreamEventParser
  ) {
    void this.consume();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get isError(): boolean {
    return this.error !== null;
  }

  private async consume(): Promise<void> {
    let buffer = '';
    try {
      for await (const chunk of this.capture) {
        const block = detectBlockError(chunk.status, chunk.url);
        if (block) {
          this.fail(new ProviderBlockError(block, `Provider blocked the request (${block})`));
          return;
        }

        buffer += chunk.text;

        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          let line = buffer.slice(0, newline).replace(/\r$/, '');
          buffer = buffer.slice(newline + 1);

          line = line.trim();
          if (!line) continue;
          if (line.startsWith('data:')) line = line.slice(5).trim();
          if (line === '[DONE]') {
            this.finish();
            return;
          }

          const event = this.parser.parse(line);
          if (event.error) {
            this.fail(new ProviderStreamError(event.error));
            return;
          }
          if (event.text) {
            this.queue.push(event.text);
            this.waiter?.();
          }
          if (event.done) {
            this.finish();
            return;
          }
        }
      }
      this.finish();
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private finish(): void {
    this.finished = true;
    this.waiter?.();
  }

  private fail(error: Error): void {
    this.error = error;
    this.finished = true;
    this.waiter?.();
  }

  /** Wait up to `timeoutMs` for the next token; null means timeout or finish. */
  async take(timeoutMs: number): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      if (this.queue.length > 0) return this.queue.shift()!;
      if (this.error) throw this.error;
      if (this.finished) return null;

      const remaining = deadline - Date.now();
      if (remaining <= 0) return null;

      let timer: ReturnType<typeof setTimeout> | null = null;
      await Promise.race([
        new Promise<void>((resolve) => {
          this.waiter = resolve;
        }),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, remaining);
        }),
      ]);
      if (timer) clearTimeout(timer);
      this.waiter = null;
    }
  }

  /** Emit tokens until the stream finishes or an error occurs. */
  async *tokens(): AsyncIterable<string> {
    while (true) {
      const token = await this.take(120000);
      if (token === null) {
        if (this.error) throw this.error;
        return;
      }
      yield token;
    }
  }

  /**
   * Accumulate the full text. Waits up to `firstTokenGraceMs` for the first
   * token (so callers can quickly fall back to DOM when nothing is captured),
   * then keeps collecting until the stream finishes or `timeoutMs` elapses.
   * Returns null when no text arrived or the stream did not finish cleanly.
   */
  async collect(timeoutMs: number, firstTokenGraceMs = timeoutMs): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;

    const first = await this.take(firstTokenGraceMs);
    if (first === null) {
      if (this.error) throw this.error;
      return null;
    }

    let text = first;
    while (Date.now() < deadline) {
      const token = await this.take(Math.max(1, deadline - Date.now()));
      if (token === null) break;
      text += token;
    }

    if (this.error) throw this.error;
    return this.finished && text.length > 0 ? text : null;
  }

  cancel(): void {
    this.capture.cancel?.();
    this.finished = true;
    this.waiter?.();
  }
}
