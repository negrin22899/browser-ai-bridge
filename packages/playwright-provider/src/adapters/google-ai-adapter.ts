import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';
import { getProviderSelectors } from '../resilient-finder.js';
import { getProviderStreamConfig } from '../stream-parsers.js';

/**
 * Google Search AI Mode adapter.
 *
 * Works against Google Search with AI Mode (no Gemini app login required —
 * useful where gemini.google.com is blocked). The model picker (Gemini 2.5,
 * experimental codenames such as Argon) is selected on the page itself;
 * this adapter only types the prompt and reads the answer from the tab.
 */
const GOOGLE_AI_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    ...getProviderSelectors('google-ai'),
    loading: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      '[class*="loading"]',
      '[class*="generating"]',
      '[aria-busy="true"]',
      'mat-progress-bar',
    ],
  },
  timeouts: {
    response: 120000,
    navigation: 45000,
  },
  stream: getProviderStreamConfig('google-ai'),
};

export class GoogleAIPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    // udm=50 lands in AI Mode chat when available; falls back to Search.
    super(
      'google-ai',
      'https://www.google.com/search?udm=50',
      'Google AI Search',
      GOOGLE_AI_CONFIG
    );
  }
}
