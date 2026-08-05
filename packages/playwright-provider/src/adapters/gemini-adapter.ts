import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

const GEMINI_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'textarea[aria-label*="prompt" i], [contenteditable="true"][role="textbox"]',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i]',
    response: '[data-message-author-role="model"], .model-response-text, .response-container',
    loading: '[aria-label*="Loading" i], .loading-indicator, .thinking',
  },
  timeouts: {
    response: 60000,
  },
};

/**
 * Gemini Adapter - Google Gemini specific implementation
 */
export class GeminiAdapter extends PlaywrightAdapter {
  constructor() {
    super('gemini', 'https://gemini.google.com', 'Google Gemini', GEMINI_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    // Try multiple selectors for Gemini
    try {
      await session.waitForSelector(
        'textarea[aria-label*="prompt" i]',
        { timeout: 10000 }
      );
    } catch {
      // Fallback to contenteditable
      await session.waitForSelector(
        '[contenteditable="true"][role="textbox"]',
        { timeout: 10000 }
      );
    }
  }
}
