import type { Page } from 'playwright-core';

export interface SiteAdapter {
  readonly siteId: string;
  readonly siteUrl: string;
  readonly displayName: string;

  matches(url: string): boolean;
  waitForReady(page: Page): Promise<void>;
  fillInput(page: Page, message: string): Promise<void>;
  clickSend(page: Page): Promise<void>;
  extractResponse(page: Page): Promise<string>;
  isResponseComplete(page: Page): Promise<boolean>;
}
