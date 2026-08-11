import type { Page, ElementHandle } from 'playwright-core';

/**
 * Provider Reliability Layer
 * 
 * Makes browser automation resilient to UI changes.
 * Features:
 * - Multiple selector strategies with fallbacks
 * - Automatic selector discovery
 * - Health checks with recovery
 * - Session persistence
 */

export interface SelectorStrategy {
  name: string;
  selectors: string[];
  description: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  component: string;
  message?: string;
  recovery?: string;
}

export interface RecoveryAction {
  name: string;
  description: string;
  execute: () => Promise<boolean>;
}

/**
 * Resilient Element Finder
 * 
 * Tries multiple strategies to find elements.
 */
export class ResilientFinder {
  private strategies: Map<string, SelectorStrategy> = new Map();

  /**
   * Register a selector strategy
   */
  registerStrategy(strategy: SelectorStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Find element using multiple strategies
   */
  async findElement(page: Page, strategyName: string): Promise<ElementHandle | null> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    for (const selector of strategy.selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            return element;
          }
        }
      } catch {
        // Try next selector
      }
    }

    return null;
  }

  /**
   * Find element with retry
   */
  async findElementWithRetry(
    page: Page,
    strategyName: string,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<ElementHandle | null> {
    for (let i = 0; i < maxRetries; i++) {
      const element = await this.findElement(page, strategyName);
      if (element) {
        return element;
      }

      if (i < maxRetries - 1) {
        await page.waitForTimeout(delay);
      }
    }

    return null;
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): SelectorStrategy[] {
    return Array.from(this.strategies.values());
  }
}

/**
 * Health Monitor
 * 
 * Monitors provider health and triggers recovery.
 */
export class HealthMonitor {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private lastCheck: Map<string, HealthCheckResult> = new Map();

  /**
   * Register a health check
   */
  registerCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, check);
  }

  /**
   * Register a recovery action
   */
  registerRecovery(action: RecoveryAction): void {
    this.recoveryActions.set(action.name, action);
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [name, check] of this.checks) {
      try {
        const result = await check();
        this.lastCheck.set(name, result);
        results.push(result);
      } catch (error) {
        const result: HealthCheckResult = {
          healthy: false,
          component: name,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        this.lastCheck.set(name, result);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run recovery for a failed component
   */
  async recover(componentName: string): Promise<boolean> {
    const action = this.recoveryActions.get(componentName);
    if (!action) {
      return false;
    }

    try {
      return await action.execute();
    } catch {
      return false;
    }
  }

  /**
   * Get last check results
   */
  getLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastCheck);
  }
}

/**
 * Session Recovery
 * 
 * Handles browser session recovery.
 */
export class SessionRecovery {
  private page: Page | null = null;
  private targetUrl: string;
  private onRecovery?: () => Promise<void>;

  constructor(targetUrl: string, onRecovery?: () => Promise<void>) {
    this.targetUrl = targetUrl;
    this.onRecovery = onRecovery;
  }

  /**
   * Set the current page
   */
  setPage(page: Page): void {
    this.page = page;
  }

  /**
   * Check if session is alive
   */
  async isAlive(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check if page is still open
      if (this.page.isClosed()) return false;

      // Check if we can evaluate JS
      await this.page.evaluate(() => true);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to recover the session
   */
  async recover(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Try to navigate to the target URL
      await this.page.goto(this.targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for page to load
      await this.page.waitForTimeout(2000);

      // Run recovery callback if provided
      if (this.onRecovery) {
        await this.onRecovery();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get recovery status
   */
  async getStatus(): Promise<{
    alive: boolean;
    url: string;
    canRecover: boolean;
  }> {
    const alive = await this.isAlive();

    return {
      alive,
      url: this.page?.url() || '',
      canRecover: !alive && !!this.page,
    };
  }
}

/**
 * Selector Discovery
 * 
 * Discovers working selectors on a page.
 */
export class SelectorDiscovery {
  /**
   * Discover input selectors on a page
   */
  async discoverInput(page: Page): Promise<string[]> {
    const selectors: string[] = [];

    // Try common input selectors
    const candidates = [
      'textarea',
      'div[contenteditable="true"]',
      'input[type="text"]',
      '[role="textbox"]',
      '[aria-label*="message" i]',
      '[aria-label*="prompt" i]',
      '[aria-label*="input" i]',
      '.ql-editor',
      '.ProseMirror',
    ];

    for (const selector of candidates) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            selectors.push(selector);
            break;
          }
        }
      } catch {
        // Skip
      }
    }

    return selectors;
  }

  /**
   * Discover send button selectors on a page
   */
  async discoverSendButton(page: Page): Promise<string[]> {
    const selectors: string[] = [];

    const candidates = [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[type="submit"]',
      'button:has(svg)',
      '.send-button',
    ];

    for (const selector of candidates) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible();
          const isDisabled = await element.evaluate((el: any) => el.disabled);
          if (isVisible && !isDisabled) {
            selectors.push(selector);
            break;
          }
        }
      } catch {
        // Skip
      }
    }

    return selectors;
  }

  /**
   * Discover response selectors on a page
   */
  async discoverResponse(page: Page): Promise<string[]> {
    const selectors: string[] = [];

    const candidates = [
      '[data-message-author-role="assistant"]',
      '[data-message-author-role="model"]',
      '.assistant-message',
      '.model-response',
      '.response-content',
      '.markdown',
    ];

    for (const selector of candidates) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          selectors.push(selector);
        }
      } catch {
        // Skip
      }
    }

    return selectors;
  }
}
