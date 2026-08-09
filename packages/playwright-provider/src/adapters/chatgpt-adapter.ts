import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

/**
 * ChatGPT PlaywrightAdapter configuration
 *
 * Selectors tested against ChatGPT UI as of 2025-2026.
 */
const CHATGPT_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: '#prompt-textarea, [id="prompt-textarea"], div[contenteditable="true"][data-placeholder], textarea[aria-label*="message" i], div[contenteditable="true"]',
    sendButton: 'button[data-testid="send-button"], button[aria-label*="Send" i], button[aria-label*="Submit" i]',
    response: '[data-message-author-role="assistant"], div[data-message-author-role="assistant"], .agent-turn .markdown',
    loading: 'button[aria-label*="Stop" i], button[data-testid="stop-button"], .result-streaming',
  },
  timeouts: {
    response: 120000,
  },
};

/**
 * ChatGPT Adapter - OpenAI ChatGPT specific implementation
 */
export class ChatGPTPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('chatgpt', 'https://chatgpt.com', 'ChatGPT', CHATGPT_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    const selectors = [
      '#prompt-textarea',
      '[id="prompt-textarea"]',
      'div[contenteditable="true"][data-placeholder]',
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

    throw new Error('Could not find ChatGPT input field');
  }
}
