import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';
import { getProviderSelectors } from '../resilient-finder.js';

/**
 * Claude PlaywrightAdapter configuration.
 *
 * Claude uses ProseMirror contenteditable divs for input.
 * Selectors come from the shared resilient strategy table.
 */
const CLAUDE_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    ...getProviderSelectors('claude'),
    loading: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      '.loading-indicator',
      '[aria-busy="true"]',
    ],
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
}
