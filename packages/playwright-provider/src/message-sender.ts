import type { BrowserSession } from './browser-session.js';

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
    await session.waitForSelector(this.inputSelector, 10000);
    await session.typeInto(this.inputSelector, message);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await session.click(this.sendButtonSelector);
  }

  async sendWithEnter(session: BrowserSession, message: string): Promise<void> {
    await session.waitForSelector(this.inputSelector, 10000);
    await session.typeInto(this.inputSelector, message);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await session.pressKey('Enter');
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
