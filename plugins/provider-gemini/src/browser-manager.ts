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
  /** Connect to existing Chrome via CDP */
  cdpPort?: number;
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
      cdpPort: options?.cdpPort ?? 9222,
    };
  }

  /**
   * Find Chrome executable path
   */
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

    throw new Error('Chrome not found. Please install Chrome or provide executablePath.');
  }

  /**
   * Find Chrome user data directory
   */
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

    throw new Error('Chrome user data directory not found.');
  }

  /**
   * Launch browser with user's existing profile
   * This uses a copy of the profile to avoid conflicts with running Chrome
   */
  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    const executablePath = this.options.executablePath;
    if (!executablePath) {
      throw new Error('Chrome executable path not set');
    }

    // Try to connect to existing Chrome via CDP first
    try {
      this.browser = await chromium.connectOverCDP(`http://localhost:${this.options.cdpPort}`);
      this.context = this.browser.contexts()[0] || await this.browser.newContext();
      console.log('Connected to existing Chrome via CDP');
      return this.context;
    } catch {
      // CDP connection failed, try other methods
    }

    // Try to launch with a copy of the user profile
    if (this.options.useExistingProfile && this.options.userDataDir) {
      try {
        // Create a temporary profile directory
        const tempProfileDir = path.join(os.tmpdir(), 'bab-chrome-profile', Date.now().toString());

        // Copy essential files from user profile
        this.copyProfile(this.options.userDataDir, tempProfileDir);

        // Launch with the copied profile
        this.context = await chromium.launchPersistentContext(
          tempProfileDir,
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
        console.log('Launched Chrome with copied profile');
        return this.context;
      } catch (error) {
        console.warn('Failed to launch with copied profile:', error);
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
   * Copy essential profile files
   */
  private copyProfile(source: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Copy cookies and login state
    const filesToCopy = [
      'Cookies',
      'Cookies-journal',
      'Login Data',
      'Login Data-journal',
      'Web Data',
      'Web Data-journal',
      'Preferences',
      'Secure Preferences',
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(source, 'Default', file);
      const destPath = path.join(dest, 'Default', file);

      try {
        if (fs.existsSync(sourcePath)) {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(sourcePath, destPath);
        }
      } catch {
        // Ignore copy errors
      }
    }
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
      const hostname = new URL(url).hostname;
      for (const page of pages) {
        if (page.url().includes(hostname)) {
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
