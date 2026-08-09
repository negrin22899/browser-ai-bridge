import type {
  Provider,
  ProviderStatus,
  ProviderType,
  ProviderCapabilities,
  HealthCheckResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ToolDescription,
} from '@bab/protocol';
import { DEFAULT_CAPABILITIES } from '@bab/protocol';
import { chromium, type Browser } from 'playwright-core';
import type { PlaywrightAdapter } from './playwright-adapter.js';
import type { BrowserSession } from './browser-session.js';

export interface PlaywrightProviderOptions {
  id: string;
  name: string;
  adapter: PlaywrightAdapter;
  headless?: boolean;
  executablePath?: string;
}

/**
 * Playwright Provider - implements Provider interface using Playwright
 */
export class PlaywrightProvider implements Provider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType = 'browser';

  private _status: ProviderStatus = 'disconnected';
  private browser: Browser | null = null;
  private adapter: PlaywrightAdapter;
  private session: BrowserSession | null = null;
  private tools: ToolDescription[] = [];
  private headless: boolean;
  private executablePath?: string;

  constructor(options: PlaywrightProviderOptions) {
    this.id = options.id;
    this.name = options.name;
    this.adapter = options.adapter;
    this.headless = options.headless ?? true;
    this.executablePath = options.executablePath;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }

    this._status = 'connecting';

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: this.headless,
        executablePath: this.executablePath,
      });

      // Set browser in adapter
      this.adapter.setBrowser(this.browser);

      // Create session and navigate to site
      this.session = await this.adapter.createSession();

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'disconnected') {
      return;
    }

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

    try {
      // Get the last user message
      const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

      // Send message to AI
      await this.adapter.sendMessage(this.session, userMessage);

      // Wait for and read response
      const responseText = await this.adapter.readResponse(this.session);

      this._status = 'connected';

      return {
        id: `pw-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: responseText },
          finish_reason: 'stop',
        }],
      };
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    if (this._status !== 'connected' || !this.session) {
      throw new Error('Provider not connected');
    }

    this._status = 'busy';
    const chunkId = `pw-${Date.now()}`;

    try {
      // Get the last user message
      const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

      // Send message to AI
      await this.adapter.sendMessage(this.session, userMessage);

      // Stream response chunks
      for await (const chunk of this.adapter.streamResponse(this.session)) {
        yield {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: chunk,
            },
            finish_reason: null,
          }],
        };
      }

      // Send final chunk
      yield {
        id: chunkId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      };

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async health(): Promise<HealthCheckResult> {
    try {
      if (this._status === 'disconnected') {
        return {
          healthy: false,
          error: 'Not connected',
        };
      }

      if (!this.session) {
        return {
          healthy: false,
          error: 'No active session',
        };
      }

      const isReady = await this.adapter.isReady(this.session);

      return {
        healthy: isReady,
        details: {
          status: this._status,
          sessionId: this.session.id,
          url: this.session.url,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  setTools(tools: ToolDescription[]): void {
    this.tools = tools;
  }

  getTools(): ToolDescription[] {
    return this.tools;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      streaming: true,
      markdown: true,
      codeGeneration: true,
    };
  }

  cancel(): void {
    // No-op for Playwright
  }

  getAdapter(): PlaywrightAdapter {
    return this.adapter;
  }

  getSession(): BrowserSession | null {
    return this.session;
  }
}
