import { PlaywrightAdapter, type PlaywrightAdapterConfig } from '../playwright-adapter.js';

/**
 * Gemini PlaywrightAdapter configuration
 *
 * Selectors tested against Gemini UI as of 2025-2026.
 */
const GEMINI_CONFIG: PlaywrightAdapterConfig = {
  selectors: {
    input: 'rich-textarea .ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div.ql-editor[contenteditable="true"], .text-input-field [contenteditable="true"], textarea[aria-label*="prompt" i], div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea',
    sendButton: 'button.send-button, button[aria-label*="Send" i], button[aria-label*="Submit" i], button[aria-label*="Submit prompt" i], button[data-testid="send-button"], .send-button, button:has(mat-icon[fonticon="send"])',
    response: '.response-container-content, .model-response-text, [data-message-author-role="model"], .message-content, .markdown-main-panel, .response-container, model-response .markdown, message-content .markdown',
    loading: 'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], .loading-indicator, .thinking, .generating, mat-progress-bar',
  },
  timeouts: {
    response: 120000,
  },
};

/**
 * Gemini Adapter - Google Gemini specific implementation
 */
export class GeminiPlaywrightAdapter extends PlaywrightAdapter {
  constructor() {
    super('gemini', 'https://gemini.google.com', 'Google Gemini', GEMINI_CONFIG);
  }

  async waitForReady(session: any): Promise<void> {
    const selectors = [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '.text-input-field [contenteditable="true"]',
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
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

    throw new Error('Could not find Gemini input field');
  }
}
