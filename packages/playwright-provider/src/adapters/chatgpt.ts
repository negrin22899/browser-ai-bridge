import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

export class ChatGPTAdapter implements SiteAdapter {
  readonly siteId = 'chatgpt';
  readonly siteUrl = 'https://chat.openai.com';
  readonly displayName = 'ChatGPT';

  matches(url: string): boolean {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector(
      '#prompt-textarea, [id="prompt-textarea"], textarea[aria-label*="message" i]',
      { timeout: 30000 }
    );
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const input = await page.$('#prompt-textarea, [id="prompt-textarea"]');
    if (input) {
      await input.fill(message);
    }
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[data-testid="send-button"], button[aria-label*="Send" i]');
  }

  async extractResponse(page: Page): Promise<string> {
    await page.waitForSelector('[data-message-author-role="assistant"]', { timeout: 60000 });
    const responses = await page.$$('[data-message-author-role="assistant"]');
    if (responses.length === 0) return '';

    const lastResponse = responses[responses.length - 1];
    return await lastResponse.textContent() ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const stopBtn = await page.$('button[aria-label*="Stop" i]');
    return stopBtn === null;
  }
}
