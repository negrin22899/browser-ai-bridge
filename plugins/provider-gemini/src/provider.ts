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
import { PlaywrightAdapter, BrowserSession, TabManager, MessageSender, ResponseReader } from '@bab/playwright-provider';
import type { Browser } from 'playwright-core';

/**
 * Gemini Site Adapter
 */
class GeminiAdapter extends PlaywrightAdapter {
  constructor() {
    super(
      'gemini',
      'https://gemini.google.com',
      'Google Gemini',
      {
        selectors: {
          input: 'textarea[aria-label*="prompt" i], [contenteditable="true"][role="textbox"]',
          sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i]',
          response: '[data-message-author-role="model"], .model-response-text, .response-container',
          loading: '[aria-label*="Loading" i], .loading-indicator, .thinking',
        },
        timeouts: {
          response: 60000,
        },
      }
    );
  }

  async waitForReady(session: any): Promise<void> {
    try {
      await session.waitForSelector('textarea[aria-label*="prompt" i]', { timeout: 10000 });
    } catch {
      await session.waitForSelector('[contenteditable="true"][role="textbox"]', { timeout: 10000 });
    }
  }
}

/**
 * Gemini Provider - real implementation using Playwright
 */
export class GeminiProvider implements Provider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type = 'browser' as const;

  private _status: ProviderStatus = 'disconnected';
  private browser: Browser | null = null;
  private adapter: GeminiAdapter;
  private session: BrowserSession | null = null;
  private tools: ToolDescription[] = [];
  private startTime: number = 0;

  constructor() {
    this.adapter = new GeminiAdapter();
  }

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(browser?: Browser): Promise<void> {
    if (this._status === 'connected') return;

    this._status = 'connecting';
    this.startTime = Date.now();

    try {
      if (browser) {
        this.browser = browser;
      } else {
        const { chromium } = await import('playwright-core');
        this.browser = await chromium.launch({
          headless: false,
          args: ['--disable-blink-features=AutomationControlled'],
        });
      }

      this.adapter.setBrowser(this.browser);
      this.session = await this.adapter.createSession();

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'disconnected') return;

    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      await this.adapter.close();
      this._status = 'disconnected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (this._status !== 'connected' || !this.session) {
      throw new Error('Provider not connected');
    }

    this._status = 'busy';
    const startTime = Date.now();

    try {
      const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

      // Send message to Gemini
      await this.adapter.sendMessage(this.session, userMessage);

      // Wait for response
      const responseText = await this.adapter.readResponse(this.session);

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
      throw error;
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const response = await this.send(request);

    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: {
          role: 'assistant',
          content: response.choices[0].message.content ?? undefined,
        },
        finish_reason: null,
      }],
    };

    yield {
      id: response.id,
      object: 'chat.completion.chunk',
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    };
  }

  async health(): Promise<HealthCheckResult> {
    const latency = Date.now() - this.startTime;

    return {
      healthy: this._status === 'connected',
      latency,
      details: {
        status: this._status,
        sessionId: this.session?.id,
        url: this.session?.url,
      },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES.gemini;
  }

  getTools(): ToolDescription[] {
    return this.tools;
  }

  setTools(tools: ToolDescription[]): void {
    this.tools = tools;
  }

  cancel(): void {
    // No-op for browser-based provider
  }
}
