import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

/**
 * Gemini PlaywrightAdapter configuration
 *
 * Selectors tested against Gemini UI as of 2025-2026.
 */
const GEMINI_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'textarea[aria-label*="Enter a prompt" i], textarea[aria-label*="prompt" i], div[contenteditable="true"][role="textbox"], textarea[aria-label*="message" i], div[contenteditable="true"]',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"]',
    response: '[data-message-author-role="model"], .model-response-text, .response-container, div[class*="response"], div[class*="model"]',
    loading: 'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], [aria-label*="Loading" i], .loading-indicator, .thinking',
  },
  timeouts: {
    response: 120000,
  },
};

/**
 * Gemini Adapter - Google Gemini specific implementation
 */
export class GeminiPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('gemini', 'https://gemini.google.com', 'Google Gemini', GEMINI_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    const selectors = [
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[aria-label*="message" i]',
      'div[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      try {
        await session.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find Gemini input field');
  }
}
