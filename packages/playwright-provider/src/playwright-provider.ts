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
      const executablePath = this.executablePath || this.findChromePath();
      const userDataDir = this.userDataDir || this.findUserDataDir();

      // Try to connect to existing Chrome via CDP first
      try {
        this.browser = await chromium.connectOverCDP(`http://localhost:${this.cdpPort}`);
        console.log('Connected to existing Chrome via CDP');
      } catch {
        // CDP connection failed, try persistent context
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
            // Get browser from context
            this.browser = context.browser();
            console.log('Launched Chrome with existing profile');
          } catch (error) {
            console.warn('Failed to launch with existing profile:', error);
            // Fallback to new browser
            this.browser = await chromium.launch({
              headless: this.headless,
              executablePath,
            });
          }
        } else {
          // Launch new browser
          this.browser = await chromium.launch({
            headless: this.headless,
            executablePath,
          });
        }
      }

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

      // Send message to AI with context
      await this.adapter.sendMessage(this.session, userMessage, context);

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

      // Send message to AI with context
      await this.adapter.sendMessage(this.session, userMessage, context);

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
