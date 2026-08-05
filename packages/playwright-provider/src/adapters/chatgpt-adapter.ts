import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

const CHATGPT_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: '#prompt-textarea, [id="prompt-textarea"], textarea[aria-label*="message" i]',
    sendButton: 'button[data-testid="send-button"], button[aria-label*="Send" i]',
    response: '[data-message-author-role="assistant"]',
    loading: 'button[aria-label*="Stop" i]',
  },
  timeouts: {
    response: 60000,
  },
};

/**
 * ChatGPT Adapter - OpenAI ChatGPT specific implementation
 */
export class ChatGPTAdapter extends PlaywrightAdapter {
  constructor() {
    super('chatgpt', 'https://chat.openai.com', 'ChatGPT', CHATGPT_CONFIG);
  }
}
