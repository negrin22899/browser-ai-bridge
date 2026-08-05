import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

const CLAUDE_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: '[aria-label*="message" i], [contenteditable="true"]',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i]',
    response: '[data-message-author-role="assistant"], .assistant-message',
    loading: '.loading, [aria-busy="true"]',
  },
  timeouts: {
    response: 60000,
  },
};

/**
 * Claude Adapter - Anthropic Claude specific implementation
 */
export class ClaudeAdapter extends PlaywrightAdapter {
  constructor() {
    super('claude', 'https://claude.ai', 'Claude', CLAUDE_CONFIG);
  }
}
