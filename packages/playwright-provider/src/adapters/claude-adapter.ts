import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

/**
 * Claude PlaywrightAdapter configuration
 *
 * Selectors tested against Claude UI as of 2025-2026.
 * Claude uses ProseMirror contenteditable divs for input.
 */
const CLAUDE_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][aria-label*="message" i], div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea[aria-label*="message" i]',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"]',
    response: '[data-message-author-role="assistant"], div.font-claude-message, div.assistant-message, .response-content',
    loading: 'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], .loading-indicator, [aria-busy="true"]',
  },
  timeouts: {
    response: 120000,
  },
};

/**
 * Claude Adapter - Anthropic Claude specific implementation
 */
export class ClaudePlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('claude', 'https://claude.ai', 'Claude', CLAUDE_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    const selectors = [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[aria-label*="message" i]',
    ];

    for (const selector of selectors) {
      try {
        await session.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find Claude input field');
  }
}
