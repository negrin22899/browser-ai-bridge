import type { BrowserSession } from './browser-session.js';
import { toSelectorList, type SelectorList } from './selector-utils.js';

/**
 * Message Sender - types a message into the chat input and submits it.
 *
 * Accepts ordered selector lists so that a site layout change degrades
 * gracefully: each selector is tried in turn until a visible, usable element
 * is found.
 */
export class MessageSender {
  private inputSelectors: string[];
  private sendButtonSelectors: string[];

  constructor(
    inputSelectors: SelectorList = 'textarea',
    sendButtonSelectors: SelectorList = 'button[type="submit"]'
  ) {
    this.inputSelectors = toSelectorList(inputSelectors);
    this.sendButtonSelectors = toSelectorList(sendButtonSelectors);
  }

  async send(session: BrowserSession, message: string): Promise<void> {
    await this.waitForInput(session);
    await this.typeIntoFirst(session, message);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.clickSend(session);
  }

  async sendWithEnter(session: BrowserSession, message: string): Promise<void> {
    await this.waitForInput(session);
    await this.typeIntoFirst(session, message);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await session.pressKey('Enter');
  }

  async isReady(session: BrowserSession): Promise<boolean> {
    for (const selector of this.inputSelectors) {
      try {
        const input = await session.$(selector);
        if (input) {
          const visible = await input.isVisible().catch(() => false);
          if (visible) {
            return true;
          }
        }
      } catch {
        // Try next selector
      }
    }
    return false;
  }

  private async waitForInput(session: BrowserSession): Promise<void> {
    for (const selector of this.inputSelectors) {
      try {
        await session.waitForSelector(selector, 5000);
        return;
      } catch {
        // Try next selector
      }
    }
    throw new Error('Input field not found');
  }

  private async typeIntoFirst(session: BrowserSession, message: string): Promise<void> {
    for (const selector of this.inputSelectors) {
      try {
        const element = await session.$(selector);
        if (!element) continue;

        const visible = await element.isVisible().catch(() => false);
        if (!visible) continue;

        await session.typeInto(selector, message);
        return;
      } catch {
        // Try next selector
      }
    }
    throw new Error('Input field not found');
  }

  private async clickSend(session: BrowserSession): Promise<void> {
    for (const selector of this.sendButtonSelectors) {
      try {
        const element = await session.$(selector);
        if (!element) continue;

        const visible = await element.isVisible().catch(() => false);
        const enabled = await element
          .evaluate((el) => !(el as HTMLElement).hasAttribute('disabled'))
          .catch(() => true);

        if (visible && enabled) {
          await session.click(selector);
          return;
        }
      } catch {
        // Try next selector
      }
    }

    // Fallback: most chat UIs submit on Enter.
    await session.pressKey('Enter');
  }
}
