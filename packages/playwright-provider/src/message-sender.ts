import type { BrowserSession } from './browser-session.js';

/**
 * Message Sender - sends messages to AI chat interface
 */
export class MessageSender {
  private inputSelector: string;
  private sendButtonSelector: string;

  constructor(
    inputSelector: string = 'textarea',
    sendButtonSelector: string = 'button[type="submit"]'
  ) {
    this.inputSelector = inputSelector;
    this.sendButtonSelector = sendButtonSelector;
  }

  async send(session: BrowserSession, message: string): Promise<void> {
    // Wait for input to be available
    await session.waitForSelector(this.inputSelector, 10000);

    // Clear existing content and type message
    await session.fill(this.inputSelector, message);

    // Small delay to ensure input is registered
    await new Promise(resolve => setTimeout(resolve, 100));

    // Click send button
    await session.click(this.sendButtonSelector);
  }

  async sendWithEnter(session: BrowserSession, message: string): Promise<void> {
    // Wait for input to be available
    await session.waitForSelector(this.inputSelector, 10000);

    // Type message
    await session.fill(this.inputSelector, message);

    // Press Enter to send
    await session.type(this.inputSelector, 'Enter');
  }

  async isReady(session: BrowserSession): Promise<boolean> {
    try {
      const input = await session.$(this.inputSelector);
      return input !== null;
    } catch {
      return false;
    }
  }
}
