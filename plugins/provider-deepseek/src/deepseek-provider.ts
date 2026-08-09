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
 * DeepSeek Provider - real implementation using Playwright
 *
 * Connects to existing Chrome profile with DeepSeek Chat open.
 * Supports chat.deepseek.com domain.
 */
export class DeepSeekProvider implements Provider {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly type = 'browser' as const;

  private _status: ProviderStatus = 'disconnected';
  private browserManager: BrowserManager;
  private page: Page | null = null;
  private tools: ToolDescription[] = [];
  private startTime: number = 0;
  private lastError: string | null = null;

  // DeepSeek UI selectors (tested against chat.deepseek.com as of 2025-2026)
  private static readonly SELECTORS = {
    input: [
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
    ],
    sendButton: [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[data-testid="send-button"]',
      'div[role="button"][aria-label*="Send" i]',
      'button:has(svg)',
    ],
    response: [
      'div[class*="message"][class*="assistant"]',
      'div[class*="response"]',
      'div[class*="answer"]',
      '[data-message-author-role="assistant"]',
      '.markdown-body',
    ],
    loading: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
      'div[class*="loading"]',
      'div[class*="thinking"]',
      '.generating',
    ],
    stopButton: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Cancel" i]',
    ],
    loginButton: [
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      'a:has-text("Log in")',
      'a[href*="/login"]',
    ],
    newChat: [
      'button:has-text("New chat")',
      'a:has-text("New chat")',
      'div[class*="new-chat"]',
    ],
  };

  constructor(options?: BrowserManagerOptions) {
    this.browserManager = new BrowserManager(options);
  }

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected') return;

    this._status = 'connecting';
    this.startTime = Date.now();
    this.lastError = null;

    try {
      const context = await this.browserManager.launch();
      this.page = await this.browserManager.getPage('https://chat.deepseek.com');

      // Navigate to DeepSeek if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes('chat.deepseek.com')) {
        await this.page.goto('https://chat.deepseek.com', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
      }

      // Wait for page to be ready
      await this.waitForReady();

      // Check authorization
      await this.checkAuthorization();

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  private async waitForReady(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Wait a bit for dynamic content to load
    await this.page.waitForTimeout(2000);

    // Try each selector until one works
    for (const selector of DeepSeekProvider.SELECTORS.input) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find chat input. Please make sure DeepSeek Chat is open and loaded.');
  }

  private async checkAuthorization(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Check for login buttons
    for (const selector of DeepSeekProvider.SELECTORS.loginButton) {
      try {
        const loginButton = await this.page.$(selector);
        if (loginButton) {
          throw new Error('User not authorized. Please log in to DeepSeek Chat first.');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not authorized')) {
          throw error;
        }
      }
    }

    // Check for error messages
    const errorMessage = await this.page.$('[role="alert"], .error-message, .alert-error');
    if (errorMessage) {
      const text = await errorMessage.textContent();
      if (text && (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in'))) {
        throw new Error('User not authorized. Please log in to DeepSeek Chat first.');
      }
    }
  }

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
        id: `deepseek-${Date.now()}`,
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

  private async fillInput(message: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    for (const selector of DeepSeekProvider.SELECTORS.input) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          await element.click();
          await this.page.waitForTimeout(100);

          // Handle contenteditable divs
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const isContentEditable = await element.evaluate(el => el.getAttribute('contenteditable') === 'true');

          if (tagName === 'div' || isContentEditable) {
            await this.page.keyboard.type(message, { delay: 5 });
          } else {
            await element.fill(message);
          }
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error('Could not find input field');
  }

  private async clickSend(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    for (const selector of DeepSeekProvider.SELECTORS.sendButton) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const isDisabled = await element.evaluate((el: any) => el.disabled);
          if (!isDisabled) {
            await element.click();
            return;
          }
        }
      } catch {
        // Try next selector
      }
    }

    // Fallback: press Enter
    await this.page.keyboard.press('Enter');
  }

  private async waitForResponse(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    // Wait for response to start
    await this.page.waitForTimeout(1000);

    // Wait for loading to finish
    const startTime = Date.now();
    const timeout = 120000; // 120 seconds for longer responses

    while (Date.now() - startTime < timeout) {
      const isLoading = await this.isLoading();
      if (!isLoading) {
        // Wait a bit more to ensure response is complete
        await this.page.waitForTimeout(1000);

        // Check again if loading started (streaming might still be happening)
        const isStillLoading = await this.isLoading();
        if (!isStillLoading) {
          break;
        }
      }

      await this.page.waitForTimeout(500);
    }

    // Extract response
    const response = await this.extractResponse();
    if (!response) {
      throw new Error('Could not extract response from DeepSeek');
    }

    return response;
  }

  private async isLoading(): Promise<boolean> {
    if (!this.page) return false;

    for (const selector of DeepSeekProvider.SELECTORS.loading) {
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

  private async extractResponse(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    for (const selector of DeepSeekProvider.SELECTORS.response) {
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

  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES.deepseek;
  }

  setTools(tools: ToolDescription[]): void {
    this.tools = tools;
  }

  getTools(): ToolDescription[] {
    return this.tools;
  }

  cancel(): void {
    if (this.page) {
      for (const selector of DeepSeekProvider.SELECTORS.stopButton) {
        this.page.$(selector).then(element => {
          if (element) {
            element.click().catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }
}
