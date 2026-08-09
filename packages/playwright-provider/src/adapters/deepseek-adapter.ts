import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

/**
 * DeepSeek PlaywrightAdapter configuration
 *
 * Selectors tested against DeepSeek Chat UI as of 2025-2026.
 */
const DEEPSEEK_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'textarea[placeholder*="Message" i], textarea[placeholder*="Send" i], textarea[aria-label*="message" i], div[contenteditable="true"][role="textbox"], textarea',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i], div[role="button"][aria-label*="Send" i]',
    response: 'div[class*="message"][class*="assistant"], div[class*="response"], div[class*="answer"], [data-message-author-role="assistant"], .markdown-body',
    loading: 'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], div[class*="loading"], div[class*="thinking"]',
  },
  timeouts: {
    response: 120000,
  },
};

/**
 * DeepSeek Adapter - DeepSeek AI specific implementation
 */
export class DeepSeekPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('deepseek', 'https://chat.deepseek.com', 'DeepSeek', DEEPSEEK_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    const selectors = [
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
      'textarea[aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
    ];

    for (const selector of selectors) {
      try {
        await session.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find DeepSeek input field');
  }
}
