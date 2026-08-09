import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

/**
 * DeepSeek Adapter - real implementation for chat.deepseek.com
 *
 * Selectors tested against DeepSeek Chat UI as of 2025-2026.
 */
export class DeepSeekAdapter implements SiteAdapter {
  readonly siteId = 'deepseek';
  readonly siteUrl = 'https://chat.deepseek.com';
  readonly displayName = 'DeepSeek';

  matches(url: string): boolean {
    return url.includes('chat.deepseek.com') || url.includes('deepseek.com');
  }

  async waitForReady(page: Page): Promise<void> {
    const selectors = [
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find DeepSeek input field');
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const selectors = [
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
      'textarea[aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
    ];

    for (const selector of selectors) {
      try {
        const input = await page.$(selector);
        if (input) {
          await input.click();
          await page.waitForTimeout(100);

          // Handle contenteditable divs
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());
          const isContentEditable = await input.evaluate(el => el.getAttribute('contenteditable') === 'true');

          if (tagName === 'div' || isContentEditable) {
            await page.keyboard.type(message, { delay: 5 });
          } else {
            await input.fill(message);
          }
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find DeepSeek input field');
  }

  async clickSend(page: Page): Promise<void> {
    const selectors = [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[data-testid="send-button"]',
      'div[role="button"][aria-label*="Send" i]',
    ];

    for (const selector of selectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const isDisabled = await button.evaluate((el: any) => el.disabled);
          if (!isDisabled) {
            await button.click();
            return;
          }
        }
      } catch {
        // Try next selector
      }
    }

    // Fallback: press Enter
    await page.keyboard.press('Enter');
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      'div[class*="message"][class*="assistant"]',
      'div[class*="response"]',
      'div[class*="answer"]',
      '[data-message-author-role="assistant"]',
      '.markdown-body',
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 60000 });
        const responses = await page.$$(selector);
        if (responses.length > 0) {
          const lastResponse = responses[responses.length - 1];
          const text = await lastResponse.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Try next selector
      }
    }

    return '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const stopSelectors = [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
    ];

    for (const selector of stopSelectors) {
      const stopBtn = await page.$(selector);
      if (stopBtn) {
        return false;
      }
    }

    return true;
  }
}
