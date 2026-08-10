import type {
  Provider,
  ProviderStatus,
  ProviderCapabilities,
  HealthCheckResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ToolDescription,
} from '@bab/protocol';
import { PROVIDER_CAPABILITIES } from '@bab/protocol';
import type { Page } from 'playwright-core';
import { BrowserManager, type BrowserManagerOptions } from './browser-manager.js';

/**
 * Gemini Provider - real implementation using Playwright
 * 
 * Connects to existing Chrome profile with Gemini open.
 * No stubs, no mocks.
 */
export class GeminiProvider implements Provider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type = 'browser' as const;

  private _status: ProviderStatus = 'disconnected';
  private browserManager: BrowserManager;
  private page: Page | null = null;
  private tools: ToolDescription[] = [];
  private startTime: number = 0;
  private lastError: string | null = null;

  // Selectors for Gemini UI (updated for 2025-2026)
  private static readonly SELECTORS = {
    input: [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '.text-input-field [contenteditable="true"]',
      'textarea[aria-label*="prompt" i]',
      'textarea[aria-label*="Enter" i]',
      '[contenteditable="true"][role="textbox"]',
      '.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"]',
      'textarea',
    ],
    sendButton: [
      'button.send-button',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[aria-label*="Submit prompt" i]',
      'button[data-testid="send-button"]',
      '.send-button',
      'button[mat-icon-button] .send-icon',
      'mat-icon[fonticon="send"]',
      'button:has(mat-icon[fonticon="send"])',
      'button:has(svg path[d*="M2.01 21"])',
    ],
    response: [
      '.response-container-content',
      '.model-response-text',
      '[data-message-author-role="model"]',
      '.message-content',
      '.markdown-main-panel',
      '.response-container',
      'model-response .markdown',
      'message-content .markdown',
    ],
    loading: [
      '.loading-indicator',
      '.thinking',
      '.generating',
      '[aria-label*="Loading" i]',
      'mat-progress-bar',
      '.progress-bar',
    ],
    stopButton: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      'button:has(mat-icon[fonticon="stop"])',
    ],
  };

  constructor(options?: BrowserManagerOptions) {
    this.browserManager = new BrowserManager(options);
  }

  get status(): ProviderStatus {
    return this._status;
  }

  /**
   * Connect to Gemini
   */
  async connect(): Promise<void> {
    if (this._status === 'connected') return;

    this._status = 'connecting';
    this.startTime = Date.now();
    this.lastError = null;

    try {
      // Launch browser
      const context = await this.browserManager.launch();
      
      // Get or create page
      this.page = await this.browserManager.getPage('https://gemini.google.com');
      
      // Navigate to Gemini if not already there
      if (!this.page.url().includes('gemini.google.com')) {
        await this.page.goto('https://gemini.google.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      }

      // Wait for page to be ready
      await this.waitForReady();

      // Check if user is authorized
      await this.checkAuthorization();

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  /**
   * Wait for Gemini page to be ready
   */
  private async waitForReady(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Try each selector until one works
    for (const selector of GeminiProvider.SELECTORS.input) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find chat input. Please make sure Gemini is open and loaded.');
  }

  /**
   * Check if user is authorized
   */
  private async checkAuthorization(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Check for sign-in button or login prompt
    const signInButton = await this.page.$('button:has-text("Sign in"), a:has-text("Sign in")');
    if (signInButton) {
      throw new Error('User not authorized. Please sign in to Gemini first.');
    }

    // Check for error messages
    const errorMessage = await this.page.$('.error-message, [role="alert"]');
    if (errorMessage) {
      const text = await errorMessage.textContent();
      if (text && text.toLowerCase().includes('sign in')) {
        throw new Error('User not authorized. Please sign in to Gemini first.');
      }
    }
  }

  /**
   * Disconnect from Gemini
   */
  async disconnect(): Promise<void> {
    try {
      await this.browserManager.close();
      this.page = null;
      this._status = 'disconnected';
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Disconnect failed';
      throw error;
    }
  }

  /**
   * Send message to Gemini
   */
  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (this._status !== 'connected' || !this.page) {
      throw new Error('Provider not connected');
    }

    this._status = 'busy';
    const startTime = Date.now();

    try {
      const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

      // Find and fill input
      await this.fillInput(userMessage);

      // Click send
      await this.clickSend();

      // Wait for response
      const responseText = await this.waitForResponse();

      this._status = 'connected';

      return {
        id: `gemini-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseText,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: userMessage.length,
          completion_tokens: responseText.length,
          total_tokens: userMessage.length + responseText.length,
        },
      };
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Send failed';
      throw error;
    }
  }

  /**
   * Fill input with message
   */
  private async fillInput(message: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Wait a bit for the page to fully load
    await this.page.waitForTimeout(1000);

    for (const selector of GeminiProvider.SELECTORS.input) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          // Check if element is visible
          const isVisible = await element.isVisible();
          if (!isVisible) continue;

          await element.click();
          await this.page.waitForTimeout(200);

          // Clear existing content
          await this.page.keyboard.press('Control+A');
          await this.page.keyboard.press('Backspace');
          await this.page.waitForTimeout(100);

          // Type the message
          await this.page.keyboard.type(message, { delay: 5 });
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find input field');
  }

  /**
   * Click send button
   */
  private async clickSend(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Wait a bit for button to become active
    await this.page.waitForTimeout(500);

    // Try to click using JavaScript directly (bypasses element interception)
    const clicked = await this.page.evaluate((selectors: string[]) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && !element.hasAttribute('disabled')) {
          (element as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, GeminiProvider.SELECTORS.sendButton);

    if (clicked) {
      return;
    }

    // Fallback: press Enter
    await this.page.keyboard.press('Enter');
  }

  /**
   * Wait for Gemini response
   */
  private async waitForResponse(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Wait for loading indicator to appear
    await this.page.waitForTimeout(500);

    // Wait for loading to finish
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds

    while (Date.now() - startTime < timeout) {
      // Check if still loading
      const isLoading = await this.isLoading();
      if (!isLoading) {
        break;
      }

      // Check if generation was interrupted
      const isInterrupted = await this.isInterrupted();
      if (isInterrupted) {
        throw new Error('Generation was interrupted');
      }

      await this.page.waitForTimeout(500);
    }

    // Extract response
    const response = await this.extractResponse();
    if (!response) {
      throw new Error('Could not extract response from Gemini');
    }

    return response;
  }

  /**
   * Check if Gemini is still loading
   */
  private async isLoading(): Promise<boolean> {
    if (!this.page) return false;

    for (const selector of GeminiProvider.SELECTORS.loading) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      } catch {
        // Continue
      }
    }

    return false;
  }

  /**
   * Check if generation was interrupted
   */
  private async isInterrupted(): Promise<boolean> {
    if (!this.page) return false;

    // Check for error messages
    const errorMessage = await this.page.$('.error-message, [role="alert"]');
    if (errorMessage) {
      const text = await errorMessage.textContent();
      if (text && (text.includes('error') || text.includes('failed'))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract response text
   */
  private async extractResponse(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    for (const selector of GeminiProvider.SELECTORS.response) {
      try {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          const lastElement = elements[elements.length - 1];
          const text = await lastElement.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Continue
      }
    }

    // Fallback: get all text from main content area
    const mainContent = await this.page.$('main, [role="main"], .chat-container');
    if (mainContent) {
      const text = await mainContent.textContent();
      if (text) {
        return text.trim();
      }
    }

    return '';
  }

  /**
   * Stream response from Gemini
   */
  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const response = await this.send(request);

    // Split response into chunks for streaming
    const text = response.choices[0].message.content ?? '';
    const chunkSize = 50;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      const isLast = i + chunkSize >= text.length;

      yield {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [{
          index: 0,
          delta: {
            role: 'assistant',
            content: chunk,
          },
          finish_reason: isLast ? 'stop' : null,
        }],
      };
    }
  }

  /**
   * Get health status
   */
  async health(): Promise<HealthCheckResult> {
    const latency = Date.now() - this.startTime;

    return {
      healthy: this._status === 'connected',
      latency,
      error: this.lastError ?? undefined,
      details: {
        status: this._status,
        url: this.page?.url(),
        browserConnected: this.browserManager.isConnected(),
      },
    };
  }

  /**
   * Get capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES.gemini;
  }

  /**
   * Set tools
   */
  setTools(tools: ToolDescription[]): void {
    this.tools = tools;
  }

  /**
   * Get tools
   */
  getTools(): ToolDescription[] {
    return this.tools;
  }

  /**
   * Cancel current request
   */
  cancel(): void {
    // Try to click stop button
    if (this.page) {
      for (const selector of GeminiProvider.SELECTORS.stopButton) {
        this.page.$(selector).then(element => {
          if (element) {
            element.click().catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }
}
