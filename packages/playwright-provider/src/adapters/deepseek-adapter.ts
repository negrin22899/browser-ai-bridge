import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

const DEEPSEEK_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'textarea[aria-label*="message" i], textarea[placeholder*="message" i]',
    sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i]',
    response: '[data-message-author-role="assistant"], .assistant-message',
    loading: '.loading, [aria-busy="true"]',
  },
  timeouts: {
    response: 60000,
  },
};

/**
 * DeepSeek Adapter - DeepSeek AI specific implementation
 */
export class DeepSeekAdapter extends PlaywrightAdapter {
  constructor() {
    super('deepseek', 'https://chat.deepseek.com', 'DeepSeek', DEEPSEEK_CONFIG);
  }
}
