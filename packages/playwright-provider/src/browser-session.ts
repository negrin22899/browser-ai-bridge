import type { Page, ElementHandle } from 'playwright-core';

/**
 * Browser Session - manages a single browser tab/page
 */
export class BrowserSession {
  readonly id: string;
  private page: Page | null = null;
  private _url: string = '';
  private _title: string = '';
  private _createdAt: number;

  constructor(id: string) {
    this.id = id;
    this._createdAt = Date.now();
  }

  get url(): string {
    return this._url;
  }

  get title(): string {
    return this._title;
  }

  get createdAt(): number {
    return this._createdAt;
  }

  get isActive(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  async attach(page: Page): Promise<void> {
    this.page = page;
    this._url = page.url();
    this._title = await page.title();
  }

  async detach(): Promise<void> {
    this.page = null;
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    this._url = url;
    this._title = await this.page.title();
  }

  async getContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    return await this.page.content();
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    await this.page.waitForSelector(selector, { timeout });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }

    // Use JavaScript click to bypass element interception issues
    // This is more reliable for modern web apps with overlays
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        (element as HTMLElement).click();
        return true;
      }
      return false;
    }, selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    await this.page.fill(selector, value);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    await this.page.type(selector, text);
  }

  async getText(selector: string): Promise<string> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    return await this.page.textContent(selector) ?? '';
  }

  async $(selector: string): Promise<ElementHandle | null> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    return await this.page.$(selector);
  }

  async $$(selector: string): Promise<ElementHandle[]> {
    if (!this.page) {
      throw new Error('Session not attached to a page');
    }
    return await this.page.$$(selector);
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }
}
