import type { Browser } from 'playwright-core';
import { BrowserSession } from './browser-session.js';
import { TabManager } from './tab-manager.js';
import { MessageSender } from './message-sender.js';
import { ResponseReader } from './response-reader.js';

export interface PlaywrightAdapterConfig {
  selectors: {
    input: string;
    sendButton: string;
    response: string;
    loading?: string;
  };
  timeouts?: {
    response?: number;
    navigation?: number;
  };
}

/**
 * Playwright Adapter - abstracts browser automation for AI sites
 */
export class PlaywrightAdapter {
  readonly siteId: string;
  readonly siteUrl: string;
  readonly displayName: string;

  protected tabManager: TabManager;
  protected messageSender: MessageSender;
  protected responseReader: ResponseReader;
  protected config: PlaywrightAdapterConfig;

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

    this.tabManager = new TabManager();
    this.messageSender = new MessageSender(
      config.selectors.input,
      config.selectors.sendButton
    );
    this.responseReader = new ResponseReader({
      responseSelector: config.selectors.response,
      loadingSelector: config.selectors.loading,
      timeout: config.timeouts?.response ?? 60000,
    });
  }

  setBrowser(browser: Browser): void {
    this.tabManager.setBrowser(browser);
  }

  async createSession(): Promise<BrowserSession> {
    const session = await this.tabManager.createSession();
    await session.navigate(this.siteUrl);
    await this.waitForReady(session);
    return session;
  }

  async waitForReady(session: BrowserSession): Promise<void> {
    // Wait for the input to be available
    await session.waitForSelector(this.config.selectors.input, 30000);
  }

  async sendMessage(session: BrowserSession, message: string): Promise<void> {
    await this.messageSender.send(session, message);
  }

  async readResponse(session: BrowserSession): Promise<string> {
    return await this.responseReader.waitForResponse(session);
  }

  async *streamResponse(session: BrowserSession): AsyncIterable<string> {
    yield* this.responseReader.streamResponse(session);
  }

  async isReady(session: BrowserSession): Promise<boolean> {
    return await this.messageSender.isReady(session);
  }

  getTabManager(): TabManager {
    return this.tabManager;
  }

  async close(): Promise<void> {
    await this.tabManager.closeAll();
  }
}
