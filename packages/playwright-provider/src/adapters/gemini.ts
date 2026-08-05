import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class GeminiAdapter implements SiteAdapter {
  readonly siteId = 'gemini';
  readonly siteUrl = 'https://gemini.google.com';
  readonly displayName = 'Google Gemini';

  matches(url: string): boolean {
    return url.includes('gemini.google.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      '[aria-label*="Enter a prompt" i], [contenteditable="true"][role="textbox"]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const textarea = await page.$('textarea[aria-label*="prompt" i]');
    if (textarea) {
      await textarea.fill(message);
      return;
    }

    const editable = await page.$('[contenteditable="true"][role="textbox"]');
    if (editable) {
      await editable.click();
      await page.keyboard.type(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[aria-label*="Send" i], button[aria-label*="Submit" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector(
      '[data-message-author-role="model"], .model-response-text, .response-container',
      { timeout: 60000 }
    );

    const responses = await page.$$('[data-message-author-role="model"]:last-child, .model-response-text:last-child');
    if (responses.length === 0) return '';

    return await responses[responses.length - 1].textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const loading = await page.$('[aria-label*="Loading" i], .loading-indicator, .thinking');
    return loading === null;
  }
}
