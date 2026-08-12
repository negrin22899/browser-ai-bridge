import type { Page, ElementHandle } from 'playwright-core';

/**
 * Resilient DOM Selectors - Auto-healing selector system
 * 
 * "DOM is fragile, Contract is solid"
 * 
 * The external API must not change even if the provider
 * completely rewrites their site layout.
 */

// ============================================================================
// SELECTOR STRATEGY
// ============================================================================

export interface SelectorStrategy {
  /** Strategy name */
  name: string;
  
  /** Selectors to try in order */
  selectors: string[];
  
  /** Description */
  description: string;
  
  /** Fallback strategy if all selectors fail */
  fallback?: SelectorStrategy;
}

// ============================================================================
// SELECTOR RESULT
// ============================================================================

export interface SelectorResult {
  /** Found element */
  element: ElementHandle | null;
  
  /** Strategy that worked */
  strategy: string;
  
  /** Selector that worked */
  selector: string;
  
  /** Was fallback used */
  fallbackUsed: boolean;
  
  /** All tried selectors */
  triedSelectors: string[];
}

// ============================================================================
// RESILIENT FINDER
// ============================================================================

/**
 * Resilient Finder - tries multiple strategies to find elements
 * 
 * Pipeline:
 * Try Selector A (Primary) -> Failed
 * Try Selector B (Legacy) -> Failed
 * Try XPath (Structural) -> Failed
 * ProviderError(DOM_CHANGED)
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
   * Find element using strategy with fallbacks
   */
  async findElement(page: Page, strategyName: string, _timeout: number = 5000): Promise<SelectorResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    const triedSelectors: string[] = [];
    let fallbackUsed = false;

    // Try primary selectors
    for (const selector of strategy.selectors) {
      triedSelectors.push(selector);
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            return {
              element,
              strategy: strategyName,
              selector,
              fallbackUsed: false,
              triedSelectors,
            };
          }
        }
      } catch {
        // Try next selector
      }
    }

    // Try fallback strategy if available
    if (strategy.fallback) {
      fallbackUsed = true;
      for (const selector of strategy.fallback.selectors) {
        triedSelectors.push(selector);
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
              return {
                element,
                strategy: strategyName,
                selector,
                fallbackUsed: true,
                triedSelectors,
              };
            }
          }
        } catch {
          // Try next selector
        }
      }
    }

    // All selectors failed
    return {
      element: null,
      strategy: strategyName,
      selector: '',
      fallbackUsed,
      triedSelectors,
    };
  }

  /**
   * Find element with retry
   */
  async findElementWithRetry(
    page: Page,
    strategyName: string,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<SelectorResult> {
    for (let i = 0; i < maxRetries; i++) {
      const result = await this.findElement(page, strategyName);
      if (result.element) {
        return result;
      }

      if (i < maxRetries - 1) {
        await page.waitForTimeout(delay);
      }
    }

    return {
      element: null,
      strategy: strategyName,
      selector: '',
      fallbackUsed: false,
      triedSelectors: [],
    };
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): SelectorStrategy[] {
    return Array.from(this.strategies.values());
  }
}

// ============================================================================
// DEFAULT STRATEGIES
// ============================================================================

/**
 * Default Gemini strategies
 */
export const GEMINI_STRATEGIES: Record<string, SelectorStrategy> = {
  input: {
    name: 'input',
    selectors: [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '.text-input-field [contenteditable="true"]',
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea',
    ],
    description: 'Gemini chat input field',
  },
  sendButton: {
    name: 'sendButton',
    selectors: [
      'button.send-button',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[aria-label*="Submit prompt" i]',
      'button[data-testid="send-button"]',
      '.send-button',
      'button:has(mat-icon[fonticon="send"])',
    ],
    description: 'Gemini send button',
  },
  response: {
    name: 'response',
    selectors: [
      '.response-container-content',
      '.model-response-text',
      '[data-message-author-role="model"]',
      '.message-content',
      '.markdown-main-panel',
      '.response-container',
      'model-response .markdown',
      'message-content .markdown',
    ],
    description: 'Gemini response container',
  },
};

/**
 * Default ChatGPT strategies
 */
export const CHATGPT_STRATEGIES: Record<string, SelectorStrategy> = {
  input: {
    name: 'input',
    selectors: [
      '#prompt-textarea',
      '[id="prompt-textarea"]',
      'div[contenteditable="true"][data-placeholder]',
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"]',
      'textarea',
    ],
    description: 'ChatGPT chat input field',
  },
  sendButton: {
    name: 'sendButton',
    selectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'form button[type="submit"]',
      'button:has(svg[data-icon="send"])',
    ],
    description: 'ChatGPT send button',
  },
  response: {
    name: 'response',
    selectors: [
      '[data-message-author-role="assistant"]',
      'div[data-message-author-role="assistant"]',
      '.agent-turn .markdown',
      '.assistant-message',
    ],
    description: 'ChatGPT response container',
  },
};

/**
 * Default Claude strategies
 */
export const CLAUDE_STRATEGIES: Record<string, SelectorStrategy> = {
  input: {
    name: 'input',
    selectors: [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[aria-label*="message" i]',
    ],
    description: 'Claude chat input field',
  },
  sendButton: {
    name: 'sendButton',
    selectors: [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[data-testid="send-button"]',
      'form button[type="submit"]',
    ],
    description: 'Claude send button',
  },
  response: {
    name: 'response',
    selectors: [
      '[data-message-author-role="assistant"]',
      'div.font-claude-message',
      'div.assistant-message',
      '.response-content',
    ],
    description: 'Claude response container',
  },
};

/**
 * Default DeepSeek strategies
 */
export const DEEPSEEK_STRATEGIES: Record<string, SelectorStrategy> = {
  input: {
    name: 'input',
    selectors: [
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
      'textarea[aria-label*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
    ],
    description: 'DeepSeek chat input field',
  },
  sendButton: {
    name: 'sendButton',
    selectors: [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'div[role="button"][aria-label*="Send" i]',
    ],
    description: 'DeepSeek send button',
  },
  response: {
    name: 'response',
    selectors: [
      'div[class*="message"][class*="assistant"]',
      'div[class*="response"]',
      'div[class*="answer"]',
      '[data-message-author-role="assistant"]',
      '.markdown-body',
    ],
    description: 'DeepSeek response container',
  },
};

/**
 * Create a resilient finder with default strategies
 */
export function createDefaultFinder(): ResilientFinder {
  const finder = new ResilientFinder();

  // Register Gemini strategies
  for (const strategy of Object.values(GEMINI_STRATEGIES)) {
    finder.registerStrategy(strategy);
  }

  // Register ChatGPT strategies
  for (const strategy of Object.values(CHATGPT_STRATEGIES)) {
    finder.registerStrategy(strategy);
  }

  // Register Claude strategies
  for (const strategy of Object.values(CLAUDE_STRATEGIES)) {
    finder.registerStrategy(strategy);
  }

  // Register DeepSeek strategies
  for (const strategy of Object.values(DEEPSEEK_STRATEGIES)) {
    finder.registerStrategy(strategy);
  }

  return finder;
}
