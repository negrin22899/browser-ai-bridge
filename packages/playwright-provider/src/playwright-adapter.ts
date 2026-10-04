import type { Browser } from 'playwright-core';
import { BrowserSession } from './browser-session.js';
import { TabManager } from './tab-manager.js';
import { MessageSender } from './message-sender.js';
import { ResponseReader } from './response-reader.js';
import { toSelectorList, type SelectorList } from './selector-utils.js';
import { withRetry } from './retry-logic.js';
import type { ProviderStreamConfig } from './stream-parsers.js';

export interface PlaywrightAdapterConfig {
  selectors: {
    input: SelectorList;
    sendButton: SelectorList;
    response: SelectorList;
    loading?: SelectorList;
  };
  timeouts?: {
    response?: number;
    navigation?: number;
  };
  /** Native SSE stream interception config (real tokens via CDP). */
  stream?: ProviderStreamConfig;
}

/**
 * Playwright Adapter - abstracts browser automation for AI sites.
 *
 * All selectors are ordered fallback lists: if a provider changes its layout,
 * the adapter moves on to the next selector instead of failing on the first
 * hardcoded one.
 */
export class PlaywrightAdapter {
  readonly siteId: string;
  readonly siteUrl: string;
  readonly displayName: string;

  protected tabManager: TabManager;
  protected messageSender: MessageSender;
  protected responseReader: ResponseReader;
  protected config: PlaywrightAdapterConfig;
  private inputSelectors: string[];
  private cancelled = false;

  constructor(
    siteId: string,
    siteUrl: string,
    displayName: string,
    config: PlaywrightAdapterConfig
  ) {
    this.siteId = siteId;
    this.siteUrl = siteUrl;
    this.displayName = displayName;
    this.config = config;
    this.inputSelectors = toSelectorList(config.selectors.input);

    this.tabManager = new TabManager();
    this.messageSender = new MessageSender(
      config.selectors.input,
      config.selectors.sendButton
    );
    this.responseReader = new ResponseReader({
      responseSelectors: config.selectors.response,
      loadingSelectors: config.selectors.loading,
      timeout: config.timeouts?.response ?? 60000,
      isCancelled: () => this.cancelled,
    });
  }

  setBrowser(browser: Browser): void {
    this.tabManager.setBrowser(browser);
  }

  async createSession(): Promise<BrowserSession> {
    return await withRetry(
      async () => {
        const session = await this.tabManager.createSession();
        await session.navigate(this.siteUrl);
        await this.waitForReady(session);
        return session;
      },
      { maxRetries: 2, initialDelay: 500, maxDelay: 2000 }
    );
  }

  async waitForReady(session: BrowserSession): Promise<void> {
    for (const selector of this.inputSelectors) {
      try {
        await session.waitForSelector(selector, 5000);
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error(`Could not find ${this.displayName} input field`);
  }

  async sendMessage(session: BrowserSession, message: string, context?: string): Promise<void> {
    const fullMessage = context ? `${context}\n\n${message}` : message;

    await withRetry(
      () => this.messageSender.send(session, fullMessage),
      { maxRetries: 2, initialDelay: 500, maxDelay: 2000 }
    );
  }

  async readResponse(session: BrowserSession): Promise<string> {
    this.cancelled = false;
    return await this.responseReader.waitForResponse(session);
  }

  async *streamResponse(session: BrowserSession): AsyncIterable<string> {
    this.cancelled = false;
    yield* this.responseReader.streamResponse(session);
  }

  /**
   * Cancel the in-flight response read.
   */
  cancel(): void {
    this.cancelled = true;
  }

  async isReady(session: BrowserSession): Promise<boolean> {
    return await this.messageSender.isReady(session);
  }

  getTabManager(): TabManager {
    return this.tabManager;
  }

  getStreamConfig(): ProviderStreamConfig | undefined {
    return this.config.stream;
  }

  async close(): Promise<void> {
    await this.tabManager.closeAll();
  }
}
