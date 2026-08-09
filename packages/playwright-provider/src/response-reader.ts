import type { BrowserSession } from './browser-session.js';

export interface ResponseReaderOptions {
  responseSelector: string;
  loadingSelector?: string;
  timeout?: number;
  pollInterval?: number;
}

/**
 * Response Reader - reads AI responses from the chat interface
 */
export class ResponseReader {
  private responseSelector: string;
  private loadingSelector: string | null;
  private timeout: number;
  private pollInterval: number;

  constructor(options: ResponseReaderOptions) {
    this.responseSelector = options.responseSelector;
    this.loadingSelector = options.loadingSelector ?? null;
    this.timeout = options.timeout ?? 60000;
    this.pollInterval = options.pollInterval ?? 500;
  }

  async waitForResponse(session: BrowserSession): Promise<string> {
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;

    while (Date.now() - startTime < this.timeout) {
      // Check if still loading
      if (this.loadingSelector) {
        const isLoading = await this.isLoading(session);
        if (isLoading) {
          await this.wait(this.pollInterval);
          continue;
        }
      }

      // Get current response content
      const content = await this.getLatestResponse(session);

      // Check if content is stable (not changing)
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
    try {
      const elements = await session.$$(this.responseSelector);
      if (elements.length === 0) return '';

      // Get the last response element
      const lastElement = elements[elements.length - 1];
      return await lastElement.textContent() ?? '';
    } catch {
      return '';
    }
  }

  async getAllResponses(session: BrowserSession): Promise<string[]> {
    try {
      const elements = await session.$$(this.responseSelector);
      const responses: string[] = [];

      for (const element of elements) {
        const text = await element.textContent() ?? '';
        if (text.trim()) {
          responses.push(text.trim());
        }
      }

      return responses;
    } catch {
      return [];
    }
  }

  private async isLoading(session: BrowserSession): Promise<boolean> {
    if (!this.loadingSelector) return false;

    try {
      const loading = await session.$(this.loadingSelector);
      return loading !== null;
    } catch {
      return false;
    }
  }

  /**
   * Stream response chunks as they are generated
   * Yields new content as it appears in the response element
   */
  async *streamResponse(session: BrowserSession): AsyncIterable<string> {
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;
    let yieldedUpTo = 0;

    // Wait for response to start
    await this.wait(500);

    while (Date.now() - startTime < this.timeout) {
      // Check if still loading
      if (this.loadingSelector) {
        const isLoading = await this.isLoading(session);
        if (isLoading) {
          stableCount = 0;
        }
      }

      // Get current response content
      const content = await this.getLatestResponse(session);

      if (content.length > yieldedUpTo) {
        // Yield new content
        const newContent = content.slice(yieldedUpTo);
        yieldedUpTo = content.length;
        yield newContent;
      }

      // Check if content is stable (not changing)
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
