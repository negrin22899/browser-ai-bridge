import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

/**
 * Claude Adapter - real implementation for claude.ai
 *
 * Selectors tested against Claude UI as of 2025-2026.
 * Claude uses ProseMirror contenteditable divs for input.
 */
export class ClaudeAdapter implements SiteAdapter {
  readonly siteId = 'claude';
  readonly siteUrl = 'https://claude.ai';
  readonly displayName = 'Claude';

  matches(url: string): boolean {
    return url.includes('claude.ai');
  }

  async waitForReady(page: Page): Promise<void> {
    const selectors = [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[aria-label*="message" i]',
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find Claude input field');
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const selectors = [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[aria-label*="message" i]',
    ];

    for (const selector of selectors) {
      try {
        const input = await page.$(selector);
        if (input) {
          await input.click();
          await page.waitForTimeout(100);

          // Claude uses ProseMirror contenteditable divs
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

    throw new Error('Could not find Claude input field');
  }

  async clickSend(page: Page): Promise<void> {
    const selectors = [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[data-testid="send-button"]',
      'form button[type="submit"]',
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

    // Fallback: press Enter (Claude sends on Enter by default)
    await page.keyboard.press('Enter');
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '[data-message-author-role="assistant"]',
      'div.font-claude-message',
      'div.assistant-message',
      '.response-content',
      'div[class*="assistant"]',
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
