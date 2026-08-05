import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class DeepSeekAdapter implements SiteAdapter {
  readonly siteId = 'deepseek';
  readonly siteUrl = 'https://chat.deepseek.com';
  readonly displayName = 'DeepSeek';

  matches(url: string): boolean {
    return url.includes('chat.deepseek.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      'textarea[aria-label*="message" i], textarea[placeholder*="message" i]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const textarea = await page.$('textarea[aria-label*="message" i], textarea[placeholder*="message" i]');
    if (textarea) {
      await textarea.fill(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[aria-label*="Send" i], button[aria-label*="Submit" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector('[data-message-author-role="assistant"], .assistant-message', { timeout: 60000 });
    const responses = await page.$$('[data-message-author-role="assistant"], .assistant-message');
    if (responses.length === 0) return '';

    return await responses[responses.length - 1].textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const loading = await page.$('.loading, [aria-busy="true"]');
    return loading === null;
  }
}
