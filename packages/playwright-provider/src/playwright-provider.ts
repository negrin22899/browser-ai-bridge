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
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { PlaywrightAdapter } from './playwright-adapter.js';
import type { BrowserSession } from './browser-session.js';
import { withRetry, withConnectionRetry } from './retry-logic.js';
import { CDPClient } from './cdp-client.js';
import { CdpTokenStream } from './stream-interceptor.js';

export interface PlaywrightProviderOptions {
  id: string;
  name: string;
  adapter: PlaywrightAdapter;
  headless?: boolean;
  executablePath?: string;
  useExistingProfile?: boolean;
  userDataDir?: string;
  cdpPort?: number;
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
  private useExistingProfile: boolean;
  private userDataDir?: string;
  private cdpPort: number;

  constructor(options: PlaywrightProviderOptions) {
    this.id = options.id;
    this.name = options.name;
    this.adapter = options.adapter;
    this.headless = options.headless ?? false;
    this.executablePath = options.executablePath;
    this.useExistingProfile = options.useExistingProfile ?? true;
    this.userDataDir = options.userDataDir;
    this.cdpPort = options.cdpPort ?? 9222;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  private findChromePath(): string {
    const platform = os.platform();
    const paths: string[] = [];

    if (platform === 'win32') {
      paths.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
      );
    } else if (platform === 'darwin') {
      paths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    } else {
      paths.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
    }

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return '';
  }

  private findUserDataDir(): string {
    const platform = os.platform();
    const paths: string[] = [];

    if (platform === 'win32') {
      paths.push(
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data')
      );
    } else if (platform === 'darwin') {
      paths.push(
        path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome')
      );
    } else {
      paths.push(
        path.join(os.homedir(), '.config', 'google-chrome')
      );
    }

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return '';
  }

  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }

    this._status = 'connecting';

    try {
      this.browser = await withConnectionRetry(
        () => this.launchBrowser(),
        this.id,
        { maxRetries: 2, initialDelay: 1000, maxDelay: 5000 }
      );

      // Set browser in adapter
      if (this.browser) {
        this.adapter.setBrowser(this.browser);
      }

      // Create session and navigate to site
      this.session = await this.adapter.createSession();

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  private async launchBrowser(): Promise<Browser> {
    const executablePath = this.executablePath || this.findChromePath();
    const userDataDir = this.userDataDir || this.findUserDataDir();

    // Try to connect to existing Chrome via CDP first
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${this.cdpPort}`);
      console.log('Connected to existing Chrome via CDP');
      return browser;
    } catch {
      // CDP connection failed, try persistent context
    }

    if (this.useExistingProfile && userDataDir) {
      try {
        const context = await chromium.launchPersistentContext(
          userDataDir,
          {
            headless: this.headless,
            executablePath,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          }
        );
        console.log('Launched Chrome with existing profile');
        const browser = context.browser();
        if (browser) {
          return browser;
        }
        throw new Error('Persistent context did not expose a browser');
      } catch (error) {
        console.warn('Failed to launch with existing profile:', error);
      }
    }

    console.log('Launching new Chrome instance');
    return await chromium.launch({
      headless: this.headless,
      executablePath,
    });
  }

  /**
   * Return the active session, recreating it if the tab was closed.
   */
  private async ensureSession(): Promise<BrowserSession> {
    try {
      if (this.session && this.session.isActive) {
        return this.session;
      }
    } catch {
      // Fall through to recreate
    }

    console.warn('Browser session no longer active, recreating...');
    this.session = await withRetry(
      () => this.adapter.createSession(),
      { maxRetries: 2, initialDelay: 500, maxDelay: 2000 }
    );
    return this.session;
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
    if (this._status !== 'connected') {
      throw new Error('Provider not connected');
    }

    this._status = 'busy';

    try {
      // Recreate the tab if it was closed since the last request.
      const session = await this.ensureSession();

      // Build conversation context from all messages except the last user message
      const lastUserIdx = request.messages.length - 1;
      const contextMessages = request.messages.slice(0, lastUserIdx);
      const userMessage = request.messages[lastUserIdx]?.content ?? '';

      // Build context string from system/assistant messages
      let context: string | undefined;
      if (contextMessages.length > 0) {
        const parts: string[] = [];
        for (const msg of contextMessages) {
          if (msg.role === 'system') {
            parts.push(`[System]: ${msg.content}`);
          } else if (msg.role === 'assistant') {
            parts.push(`[Assistant]: ${msg.content}`);
          } else if (msg.role === 'user') {
            parts.push(`[User]: ${msg.content}`);
          }
        }
        if (parts.length > 0) {
          context = parts.join('\n');
        }
      }

      // Attach CDP interception BEFORE sending so the SSE response is captured.
      const capture = await this.captureCdpStream(session);

      // Send message to AI with context
      await this.adapter.sendMessage(session, userMessage, context);

      // Prefer the real token stream captured from the network; fall back to
      // DOM reading when nothing was captured or the stream did not complete.
      let responseText: string | null = null;
      try {
        if (capture) {
          // 4s grace: if the native stream never starts, fall back to DOM.
          responseText = await capture.stream.collect(120000, 4000);
        }
      } finally {
        if (capture) await capture.dispose();
      }

      if (responseText === null) {
        responseText = await this.adapter.readResponse(session);
      }

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
    if (this._status !== 'connected') {
      throw new Error('Provider not connected');
    }

    this._status = 'busy';
    const chunkId = `pw-${Date.now()}`;

    try {
      // Recreate the tab if it was closed since the last request.
      const session = await this.ensureSession();

      // Build conversation context
      const lastUserIdx = request.messages.length - 1;
      const contextMessages = request.messages.slice(0, lastUserIdx);
      const userMessage = request.messages[lastUserIdx]?.content ?? '';

      let context: string | undefined;
      if (contextMessages.length > 0) {
        const parts: string[] = [];
        for (const msg of contextMessages) {
          if (msg.role === 'system') parts.push(`[System]: ${msg.content}`);
          else if (msg.role === 'assistant') parts.push(`[Assistant]: ${msg.content}`);
          else if (msg.role === 'user') parts.push(`[User]: ${msg.content}`);
        }
        if (parts.length > 0) context = parts.join('\n');
      }

      // Attach CDP interception BEFORE sending so the SSE response is captured.
      const capture = await this.captureCdpStream(session);

      const makeChunk = (content: string): ChatCompletionChunk => ({
        id: chunkId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          delta: {
            role: 'assistant',
            content,
          },
          finish_reason: null,
        }],
      });

      const finalChunk: ChatCompletionChunk = {
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

      // Send message to AI with context
      await this.adapter.sendMessage(session, userMessage, context);

      if (capture) {
        try {
          // Give the native stream a short grace period to produce a token;
          // if nothing arrives, fall back to DOM reading.
          const first = await capture.stream.take(4000);
          if (first !== null) {
            yield makeChunk(first);
            for await (const token of capture.stream.tokens()) {
              yield makeChunk(token);
            }
            yield finalChunk;
            this._status = 'connected';
            return;
          }
        } finally {
          await capture.dispose();
        }
      }

      // Fallback: read from DOM as the response renders.
      for await (const chunk of this.adapter.streamResponse(session)) {
        yield makeChunk(chunk);
      }

      yield finalChunk;

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
    this.adapter.cancel();
  }

  getAdapter(): PlaywrightAdapter {
    return this.adapter;
  }

  getSession(): BrowserSession | null {
    return this.session;
  }

  /**
   * Attach CDP network interception for the provider's native SSE stream.
   * Returns null when CDP is unavailable or the provider has no stream config.
   */
  private async captureCdpStream(
    session: BrowserSession
  ): Promise<{ stream: CdpTokenStream; dispose: () => Promise<void> } | null> {
    try {
      const page = session.getPage();
      if (!page) return null;

      const config = this.adapter.getStreamConfig();
      if (!config) return null;

      const cdp = new CDPClient();
      await cdp.attach(page);
      const stream = new CdpTokenStream(
        cdp.captureStream(config.urlPatterns),
        config.createParser()
      );

      return {
        stream,
        dispose: async () => {
          await cdp.detach();
        },
      };
    } catch {
      return null;
    }
  }
}
