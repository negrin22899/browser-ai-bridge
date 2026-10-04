import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';
import { getProviderSelectors } from '../resilient-finder.js';

/**
 * ChatGPT PlaywrightAdapter configuration.
 *
 * Selectors come from the shared resilient strategy table so there is one
 * source of truth per provider.
 */
const CHATGPT_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    ...getProviderSelectors('chatgpt'),
    loading: [
      'button[aria-label*="Stop" i]',
      'button[data-testid="stop-button"]',
      '.result-streaming',
    ],
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
}
