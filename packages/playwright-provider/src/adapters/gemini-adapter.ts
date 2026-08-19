import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';
import { getProviderSelectors } from '../resilient-finder.js';
import { getProviderStreamConfig } from '../stream-parsers.js';

/**
 * Gemini PlaywrightAdapter configuration.
 *
 * Selectors come from the shared resilient strategy table so there is one
 * source of truth per provider.
 */
const GEMINI_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    ...getProviderSelectors('gemini'),
    loading: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      '.loading-indicator',
      '.thinking',
      '.generating',
      'mat-progress-bar',
    ],
  },
  timeouts: {
    response: 120000,
  },
  stream: getProviderStreamConfig('gemini'),
};

/**
 * Gemini Adapter - Google Gemini specific implementation
 */
export class GeminiPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('gemini', 'https://gemini.google.com', 'Google Gemini', GEMINI_CONFIG);
  }
}
