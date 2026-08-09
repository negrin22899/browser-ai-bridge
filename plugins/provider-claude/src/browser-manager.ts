import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface BrowserManagerOptions {
  useExistingProfile?: boolean;
  executablePath?: string;
  userDataDir?: string;
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
      paths.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser');
    }

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Chrome not found. Please install Chrome or provide executablePath.');
  }

  private findUserDataDir(): string {
    const platform = os.platform();
    const paths: string[] = [];

    if (platform === 'win32') {
      paths.push(
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
        path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data')
      );
    } else if (platform === 'darwin') {
      paths.push(
        path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
        path.join(os.homedir(), 'Library', 'Application Support', 'Microsoft Edge')
      );
    } else {
      paths.push(
        path.join(os.homedir(), '.config', 'google-chrome'),
        path.join(os.homedir(), '.config', 'microsoft-edge')
      );
    }

    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Chrome user data directory not found.');
  }

  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    const executablePath = this.options.executablePath;
    if (!executablePath) {
      throw new Error('Chrome executable path not set');
    }

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
              '--disable-extensions-except=',
              '--disable-extensions',
            ],
          }
        );
        return this.context;
      } catch (error) {
        console.warn('Failed to launch with existing profile, falling back to new profile:', error);
      }
    }

    this.browser = await chromium.launch({
      headless: this.options.headless,
      executablePath,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    this.context = await this.browser.newContext();
    return this.context;
  }

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

  isConnected(): boolean {
    return this.context !== null;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

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
