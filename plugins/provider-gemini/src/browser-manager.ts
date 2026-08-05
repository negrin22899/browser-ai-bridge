import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface BrowserManagerOptions {
  /** Use existing Chrome profile */
  useExistingProfile?: boolean;
  /** Chrome executable path */
  executablePath?: string;
  /** User data directory */
  userDataDir?: string;
  /** Headless mode */
  headless?: boolean;
}

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
    };
  }

  /**
   * Find Chrome executable path
   */
  private findChromePath(): string {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ];

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Chrome not found. Please install Chrome or provide executablePath.');
  }

  /**
   * Find Chrome user data directory
   */
  private findUserDataDir(): string {
    const paths = [
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
      path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
      path.join(os.homedir(), '.config', 'google-chrome'),
    ];

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Chrome user data directory not found.');
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
      throw new Error('Chrome executable path not set');
    }

    // Launch with existing profile if available
    if (this.options.useExistingProfile && this.options.userDataDir) {
      try {
        // Use persistent context to reuse existing profile
        this.context = await chromium.launchPersistentContext(
          this.options.userDataDir,
          {
            headless: this.options.headless,
            executablePath,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          }
        );
        return this.context;
      } catch (error) {
        console.warn('Failed to launch with existing profile, falling back to new profile:', error);
      }
    }

    // Fallback to new browser instance
    this.browser = await chromium.launch({
      headless: this.options.headless,
      executablePath,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    this.context = await this.browser.newContext();
    return this.context;
  }

  /**
   * Get existing page or create new one
   */
  async getPage(url?: string): Promise<Page> {
    if (!this.context) {
      await this.launch();
    }

    // Check for existing pages
    const pages = this.context!.pages();
    
    // Try to find a page that matches the URL
    if (url) {
      for (const page of pages) {
        if (page.url().includes(new URL(url).hostname)) {
          return page;
        }
      }
    }

    // Return first available page or create new one
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
