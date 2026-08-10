import type { Page } from 'playwright-core';
import type { SiteAdapter } from '../site-adapter.js';

/**
 * Gemini Adapter - real implementation for gemini.google.com
 *
 * Selectors tested against Gemini UI as of 2025-2026.
 */
export class GeminiAdapter implements SiteAdapter {
  readonly siteId = 'gemini';
  readonly siteUrl = 'https://gemini.google.com';
  readonly displayName = 'Google Gemini';

  matches(url: string): boolean {
    return url.includes('gemini.google.com');
  }

  async waitForReady(page: Page): Promise<void> {
    const selectors = [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '.text-input-field [contenteditable="true"]',
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find Gemini input field');
  }

  async fillInput(page: Page, message: string): Promise<void> {
    const selectors = [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '.text-input-field [contenteditable="true"]',
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      try {
        const input = await page.$(selector);
        if (input) {
          const isVisible = await input.isVisible();
          if (!isVisible) continue;

          await input.click();
          await page.waitForTimeout(200);

          // Clear existing content
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(100);

          // Type the message
          await page.keyboard.type(message, { delay: 5 });
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find Gemini input field');
  }

  async clickSend(page: Page): Promise<void> {
    const selectors = [
      'button.send-button',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[aria-label*="Submit prompt" i]',
      'button[data-testid="send-button"]',
      '.send-button',
      'button:has(mat-icon[fonticon="send"])',
    ];

    // Try to click using JavaScript directly (bypasses element interception)
    const clicked = await page.evaluate((sels: string[]) => {
      for (const selector of sels) {
        const element = document.querySelector(selector);
        if (element && !element.hasAttribute('disabled')) {
          (element as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, selectors);

    if (clicked) {
      return;
    }

    // Fallback: press Enter
    await page.keyboard.press('Enter');
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '.response-container-content',
      '.model-response-text',
      '[data-message-author-role="model"]',
      '.message-content',
      '.markdown-main-panel',
      '.response-container',
      'model-response .markdown',
      'message-content .markdown',
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
      'button:has(mat-icon[fonticon="stop"])',
      '.loading-indicator',
      '.thinking',
      '.generating',
    ];

    for (const selector of stopSelectors) {
      const stopBtn = await page.$(selector);
      if (stopBtn) {
        const isVisible = await stopBtn.isVisible();
        if (isVisible) {
          return false;
        }
      }
    }

    return true;
  }
}
