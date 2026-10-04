import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';
import { getProviderSelectors } from '../resilient-finder.js';

/**
 * DeepSeek PlaywrightAdapter configuration.
 *
 * Selectors come from the shared resilient strategy table so there is one
 * source of truth per provider.
 */
const DEEPSEEK_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    ...getProviderSelectors('deepseek'),
    loading: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      'div[class*="loading"]',
      'div[class*="thinking"]',
    ],
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
}
