import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface BrowserManagerOptions {
  useExistingProfile?: boolean;
  executablePath?: string;
  userDataDir?: string;
  headless?: boolean;
  cdpPort?: number;
}

/**
 * Shared Browser Manager - used by all providers
 * 
 * Handles Chrome detection, profile management, and browser lifecycle.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private options: BrowserManagerOptions;

  constructor(options?: BrowserManagerOptions) {
    this.options = {
      useExistingProfile: options?.useExistingProfile ?? true,
      executablePath: options?.executablePath ?? this.findChromePath(),
      userDataDir: options?.userDataDir ?? this.findUserDataDir(),
      headless: options?.headless ?? false,
      cdpPort: options?.cdpPort ?? 9222,
    };
  }

  /**
   * Find Chrome executable path
   */
  findChromePath(): string {
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

  /**
   * Find Chrome user data directory
   */
  findUserDataDir(): string {
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

  /**
   * Launch browser
   */
  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    const executablePath = this.options.executablePath;
    if (!executablePath) {
      throw new Error('Chrome not found. Please install Chrome or provide executablePath.');
    }

    // Try to connect to existing Chrome via CDP
    try {
      this.browser = await chromium.connectOverCDP(`http://localhost:${this.options.cdpPort}`);
      this.context = this.browser.contexts()[0] || await this.browser.newContext();
      console.log('Connected to existing Chrome via CDP');
      return this.context;
    } catch {
      // CDP connection failed, try persistent context
    }

    // Try persistent context with user profile
    if (this.options.useExistingProfile && this.options.userDataDir) {
      try {
        this.context = await chromium.launchPersistentContext(
          this.options.userDataDir,
          {
            headless: this.options.headless,
            executablePath,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--no-first-run',
              '--no-default-browser-check',
              '--disable-extensions',
            ],
          }
        );
        console.log('Launched Chrome with existing profile');
        return this.context;
      } catch (error) {
        console.warn('Failed to launch with existing profile:', error);
      }
    }

    // Fallback to new browser instance
    this.browser = await chromium.launch({
      headless: this.options.headless,
      executablePath,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    this.context = await this.browser.newContext();
    console.log('Launched new Chrome instance');
    return this.context;
  }

  /**
   * Get existing page or create new one
   */
  async getPage(url?: string): Promise<Page> {
    if (!this.context) {
      await this.launch();
    }

    const pages = this.context!.pages();

    if (url) {
      const hostname = new URL(url).hostname;
      for (const page of pages) {
        if (page.url().includes(hostname)) {
          return page;
        }
      }
    }

    if (pages.length > 0) {
      return pages[0];
    }

    return await this.context!.newPage();
  }

  /**
   * Check if browser is connected
   */
  isConnected(): boolean {
    return this.context !== null;
  }

  /**
   * Get browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
