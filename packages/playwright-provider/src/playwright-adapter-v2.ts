import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  BrowserRuntime,
  BrowserAdapterMetadata,
  BrowserState,
  BrowserCapabilities,
  BrowserConnectOptions,
  BrowserTab,
  BrowserElement,
  BrowserError,
  BrowserHealthResult,
  BrowserConnectionState,
  NavigationOptions,
  FindOptions,
  ClickOptions,
  TypeOptions,
  WaitOptions,
  ScreenshotOptions,
} from './browser-runtime.js';

/**
 * PlaywrightAdapter - implements BrowserRuntime using Playwright
 * 
 * This is ONE of potentially many Browser Adapters.
 * Others: CDPAdapter, ExtensionAdapter
 */
export class PlaywrightAdapter implements BrowserRuntime {
  readonly metadata: BrowserAdapterMetadata = {
    id: 'playwright',
    name: 'Playwright',
    version: '1.0.0',
    type: 'playwright',
    description: 'Browser automation via Playwright',
  };

  readonly capabilities: BrowserCapabilities = {
    tabs: true,
    navigation: true,
    dom: true,
    screenshots: true,
    input: true,
    events: true,
    evaluate: true,
    launch: true,
    connectExisting: true,
  };

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private activePage: Page | null = null;
  private _state: BrowserConnectionState = 'disconnected';
  private _error: BrowserError | null = null;
  private startTime: number = 0;

  get state(): BrowserState {
    return {
      state: this._state,
      timestamp: Date.now(),
      error: this._error ?? undefined,
    };
  }

  // ============================================================================
  // CONNECTION
  // ============================================================================

  async connect(options?: BrowserConnectOptions): Promise<void> {
    this._state = 'connecting';
    this.startTime = Date.now();

    try {
      const executablePath = options?.executablePath ?? this.findChromePath();
      const userDataDir = options?.userDataDir ?? this.findUserDataDir();

      // Try CDP connection first
      if (options?.cdpEndpoint) {
        try {
          this.browser = await chromium.connectOverCDP(options.cdpEndpoint);
          this.context = this.browser.contexts()[0] || await this.browser.newContext();
          this._state = 'connected';
          return;
        } catch {
          // CDP failed, try other methods
        }
      }

      // Try persistent context with user profile
      if (userDataDir && !options?.headless) {
        try {
          this.context = await chromium.launchPersistentContext(userDataDir, {
            headless: options?.headless ?? false,
            executablePath,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          });
          this._state = 'connected';
          return;
        } catch {
          // Persistent context failed, try new browser
        }
      }

      // Fallback to new browser
      this.browser = await chromium.launch({
        headless: options?.headless ?? false,
        executablePath,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      this.context = await this.browser.newContext();
      this._state = 'connected';
    } catch (error) {
      this._state = 'error';
      this._error = {
        code: 'CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Connection failed',
        recoverable: true,
        recovery: 'Check if Chrome is installed and not running',
        original: error,
      };
      throw this._error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.activePage = null;
      this._state = 'disconnected';
      this._error = null;
    } catch (error) {
      this._state = 'error';
      this._error = {
        code: 'CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Disconnect failed',
        recoverable: false,
        original: error,
      };
    }
  }

  isConnected(): boolean {
    return this._state === 'connected';
  }

  // ============================================================================
  // HEALTH
  // ============================================================================

  async health(): Promise<BrowserHealthResult> {
    const latency = Date.now() - this.startTime;

    if (this._state !== 'connected') {
      return {
        healthy: false,
        state: this._state,
        latency,
        error: this._error ?? undefined,
      };
    }

    try {
      // Check if context is still alive
      if (this.context) {
        const pages = this.context.pages();
        return {
          healthy: true,
          state: 'connected',
          latency,
          tabCount: pages.length,
        };
      }

      return {
        healthy: false,
        state: 'error',
        error: {
          code: 'BROWSER_NOT_FOUND',
          message: 'Browser context not available',
          recoverable: true,
        },
      };
    } catch {
      return {
        healthy: false,
        state: 'error',
        error: {
          code: 'BROWSER_NOT_FOUND',
          message: 'Browser health check failed',
          recoverable: true,
        },
      };
    }
  }

  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  async listTabs(): Promise<BrowserTab[]> {
    this.ensureConnected();

    const pages = this.context!.pages();
    return pages.map((page, index) => ({
      id: `tab-${index}`,
      url: page.url(),
      title: '', // Will be filled async
      isActive: page === this.activePage,
      createdAt: Date.now(),
    }));
  }

  async createTab(url?: string): Promise<BrowserTab> {
    this.ensureConnected();

    const page = await this.context!.newPage();
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    this.activePage = page;

    return {
      id: `tab-${Date.now()}`,
      url: page.url(),
      title: await page.title(),
      isActive: true,
      createdAt: Date.now(),
    };
  }

  async closeTab(_tabId: string): Promise<void> {
    this.ensureConnected();

    const pages = this.context!.pages();
    const page = pages[0]; // Simplified: close first tab
    if (page) {
      await page.close();
    }
  }

  async activateTab(tabId: string): Promise<void> {
    this.ensureConnected();

    // Simplified: activate by index
    const pages = this.context!.pages();
    const index = parseInt(tabId.replace('tab-', ''));
    if (pages[index]) {
      this.activePage = pages[index];
    }
  }

  async getActiveTab(): Promise<BrowserTab | null> {
    if (!this.activePage) {
      const pages = this.context?.pages();
      if (pages && pages.length > 0) {
        this.activePage = pages[0];
      }
    }

    if (!this.activePage) {
      return null;
    }

    return {
      id: 'tab-0',
      url: this.activePage.url(),
      title: await this.activePage.title(),
      isActive: true,
      createdAt: Date.now(),
    };
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async navigate(url: string, options?: NavigationOptions): Promise<void> {
    const page = await this.getPage();
    await page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
      timeout: options?.timeout ?? 30000,
    });
  }

  async getCurrentUrl(): Promise<string> {
    const page = await this.getPage();
    return page.url();
  }

  async getTitle(): Promise<string> {
    const page = await this.getPage();
    return await page.title();
  }

  async goBack(): Promise<void> {
    const page = await this.getPage();
    await page.goBack();
  }

  async goForward(): Promise<void> {
    const page = await this.getPage();
    await page.goForward();
  }

  async reload(): Promise<void> {
    const page = await this.getPage();
    await page.reload();
  }

  // ============================================================================
  // DOM INTERACTION
  // ============================================================================

  async find(selector: string, options?: FindOptions): Promise<BrowserElement | null> {
    const page = await this.getPage();

    try {
      const element = await page.$(selector);
      if (!element) return null;

      const isVisible = await element.isVisible();
      if (options?.visible && !isVisible) return null;

      return {
        selector,
        isVisible,
        text: await element.textContent() ?? undefined,
        tagName: await element.evaluate(el => el.tagName.toLowerCase()),
      };
    } catch {
      return null;
    }
  }

  async findAll(selector: string, options?: FindOptions): Promise<BrowserElement[]> {
    const page = await this.getPage();

    try {
      const elements = await page.$$(selector);
      const results: BrowserElement[] = [];

      for (const element of elements) {
        const isVisible = await element.isVisible();
        if (options?.visible && !isVisible) continue;

        results.push({
          selector,
          isVisible,
          text: await element.textContent() ?? undefined,
          tagName: await element.evaluate(el => el.tagName.toLowerCase()),
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  async click(selector: string, options?: ClickOptions): Promise<void> {
    const page = await this.getPage();
    await page.click(selector, {
      force: options?.force,
      delay: options?.delay,
      timeout: options?.timeout ?? 30000,
    });
  }

  async type(selector: string, text: string, options?: TypeOptions): Promise<void> {
    const page = await this.getPage();
    await page.type(selector, text, {
      delay: options?.delay,
      timeout: options?.timeout ?? 30000,
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    const page = await this.getPage();
    await page.fill(selector, value);
  }

  async read(selector: string): Promise<string> {
    const page = await this.getPage();
    return await page.textContent(selector) ?? '';
  }

  async readAll(selector: string): Promise<string[]> {
    const page = await this.getPage();
    const elements = await page.$$(selector);
    const texts: string[] = [];

    for (const element of elements) {
      const text = await element.textContent();
      if (text) texts.push(text.trim());
    }

    return texts;
  }

  async getContent(): Promise<string> {
    const page = await this.getPage();
    return await page.content();
  }

  async waitFor(selector: string, options?: WaitOptions): Promise<void> {
    const page = await this.getPage();
    await page.waitForSelector(selector, {
      timeout: options?.timeout ?? 30000,
      state: options?.state ?? 'visible',
    });
  }

  async waitForNavigation(options?: NavigationOptions): Promise<void> {
    const page = await this.getPage();
    await page.waitForNavigation({
      waitUntil: options?.waitUntil ?? 'load',
      timeout: options?.timeout ?? 30000,
    });
  }

  // ============================================================================
  // ADVANCED
  // ============================================================================

  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    const page = await this.getPage();
    return await page.screenshot({
      fullPage: options?.fullPage,
      type: options?.format ?? 'png',
      quality: options?.quality,
    });
  }

  async evaluate<T>(script: string, ...args: unknown[]): Promise<T> {
    const page = await this.getPage();
    return await page.evaluate(script, ...args);
  }

  async pressKey(key: string): Promise<void> {
    const page = await this.getPage();
    await page.keyboard.press(key);
  }

  async scroll(direction: 'up' | 'down', amount?: number): Promise<void> {
    const page = await this.getPage();
    const delta = amount ?? 500;
    await page.mouse.wheel(0, direction === 'down' ? delta : -delta);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async getPage(): Promise<Page> {
    this.ensureConnected();

    if (!this.activePage) {
      const pages = this.context!.pages();
      if (pages.length > 0) {
        this.activePage = pages[0];
      } else {
        this.activePage = await this.context!.newPage();
      }
    }

    return this.activePage;
  }

  private ensureConnected(): void {
    if (this._state !== 'connected' || !this.context) {
      throw {
        code: 'CONNECTION_FAILED',
        message: 'Browser not connected',
        recoverable: true,
        recovery: 'Call connect() first',
      } as BrowserError;
    }
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
      if (fs.existsSync(p)) return p;
    }

    return '';
  }

  private findUserDataDir(): string {
    const platform = os.platform();
    const paths: string[] = [];

    if (platform === 'win32') {
      paths.push(path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'));
    } else if (platform === 'darwin') {
      paths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'));
    } else {
      paths.push(path.join(os.homedir(), '.config', 'google-chrome'));
    }

    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }

    return '';
  }
}
