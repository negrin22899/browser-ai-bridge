import type { BrowserSession } from './browser-session.js';
import { toSelectorList, type SelectorList } from './selector-utils.js';

export interface ResponseReaderOptions {
  /** Ordered selectors for the AI response container. */
  responseSelectors: SelectorList;
  /** Selectors that indicate the response is still being generated. */
  loadingSelectors?: SelectorList;
  /** Live-region selectors used as a fallback when response selectors fail. */
  ariaLiveSelectors?: SelectorList;
  timeout?: number;
  pollInterval?: number;
  /** When this returns true, reads are aborted with a cancellation error. */
  isCancelled?: () => boolean;
}

const DEFAULT_ARIA_LIVE_SELECTORS = [
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
  '[role="status"]',
  '[role="log"]',
];

/**
 * Response Reader - reads AI responses from the chat interface.
 *
 * Reads via multiple strategies with automatic fallback:
 *   1. The last selector that worked (cached across polls).
 *   2. The configured response selectors, in order.
 *   3. aria-live regions as a last resort.
 */
export class ResponseReader {
  private responseSelectors: string[];
  private loadingSelectors: string[];
  private ariaLiveSelectors: string[];
  private timeout: number;
  private pollInterval: number;
  private isCancelled: (() => boolean) | null;
  private cachedSelector: string | null = null;

  constructor(options: ResponseReaderOptions) {
    this.responseSelectors = toSelectorList(options.responseSelectors);
    this.loadingSelectors = options.loadingSelectors ? toSelectorList(options.loadingSelectors) : [];
    this.ariaLiveSelectors = options.ariaLiveSelectors
      ? toSelectorList(options.ariaLiveSelectors)
      : DEFAULT_ARIA_LIVE_SELECTORS;
    this.timeout = options.timeout ?? 60000;
    this.pollInterval = options.pollInterval ?? 500;
    this.isCancelled = options.isCancelled ?? null;
  }

  async waitForResponse(session: BrowserSession): Promise<string> {
    this.cachedSelector = null;
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;

    while (Date.now() - startTime < this.timeout) {
      if (this.isCancelled?.()) {
        throw new Error('Request cancelled');
      }

      if (this.loadingSelectors.length > 0) {
        const isLoading = await this.isLoading(session);
        if (isLoading) {
          stableCount = 0;
          await this.wait(this.pollInterval);
          continue;
        }
      }

      const content = await this.getLatestResponse(session);

      if (content === lastContent && content.length > 0) {
        stableCount++;
        if (stableCount >= 3) {
          return content;
        }
      } else {
        stableCount = 0;
        lastContent = content;
      }

      await this.wait(this.pollInterval);
    }

    throw new Error('Response timeout');
  }

  async getLatestResponse(session: BrowserSession): Promise<string> {
    // 1. Cached selector from a previous successful poll.
    if (this.cachedSelector) {
      const text = await this.readLastFromSelector(session, this.cachedSelector);
      if (text) {
        return text;
      }
      // The cached selector stopped matching; rediscover.
      this.cachedSelector = null;
    }

    // 2. Configured response selectors, in order.
    for (const selector of this.responseSelectors) {
      const text = await this.readLastFromSelector(session, selector);
      if (text) {
        this.cachedSelector = selector;
        return text;
      }
    }

    // 3. Live regions as a fallback.
    for (const selector of this.ariaLiveSelectors) {
      const text = await this.readLastFromSelector(session, selector);
      if (text) {
        return text;
      }
    }

    return '';
  }

  async getAllResponses(session: BrowserSession): Promise<string[]> {
    const responses: string[] = [];

    for (const selector of this.responseSelectors) {
      try {
        const elements = await session.$$(selector);
        for (const element of elements) {
          const text = (await element.textContent()) ?? '';
          const trimmed = text.trim();
          if (trimmed && !responses.includes(trimmed)) {
            responses.push(trimmed);
          }
        }
      } catch {
        // Skip broken selector
      }
    }

    return responses;
  }

  private async readLastFromSelector(session: BrowserSession, selector: string): Promise<string> {
    try {
      const elements = await session.$$(selector);
      if (elements.length === 0) return '';

      const lastElement = elements[elements.length - 1];
      const text = (await lastElement.textContent()) ?? '';
      return text.trim();
    } catch {
      return '';
    }
  }

  private async isLoading(session: BrowserSession): Promise<boolean> {
    for (const selector of this.loadingSelectors) {
      try {
        const loading = await session.$(selector);
        if (loading) {
          const visible = await loading.isVisible().catch(() => false);
          if (visible) {
            return true;
          }
        }
      } catch {
        // Try next selector
      }
    }
    return false;
  }

  /**
   * Stream response chunks as they are generated.
   * Yields new content as it appears in the response element.
   */
  async *streamResponse(session: BrowserSession): AsyncIterable<string> {
    this.cachedSelector = null;
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;
    let yieldedUpTo = 0;

    // Wait for response to start
    await this.wait(500);

    while (Date.now() - startTime < this.timeout) {
      if (this.isCancelled?.()) {
        throw new Error('Request cancelled');
      }

      const content = await this.getLatestResponse(session);

      if (content.length > yieldedUpTo) {
        const newContent = content.slice(yieldedUpTo);
        yieldedUpTo = content.length;
        yield newContent;
      }

      if (content === lastContent && content.length > 0) {
        stableCount++;
        if (stableCount >= 3) {
          return;
        }
      } else {
        stableCount = 0;
        lastContent = content;
      }

      await this.wait(this.pollInterval);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
