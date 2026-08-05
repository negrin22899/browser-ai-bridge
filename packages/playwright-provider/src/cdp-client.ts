import type { CDPSession, Page } from 'playwright-core';

export class CDPClient {
  private session: CDPSession | null = null;

  async attach(page: Page): Promise<void> {
    this.session = await page.context().newCDPSession(page);
  }

  async detach(): Promise<void> {
    if (this.session) {
      await this.session.detach();
      this.session = null;
    }
  }

  async getConsoleLogs(): Promise<string[]> {
    if (!this.session) throw new Error('Not attached');

    const logs: string[] = [];

    this.session.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(args);
    });

    await this.session.send('Runtime.enable');
    return logs;
  }

  async evaluate(expression: string): Promise<unknown> {
    if (!this.session) throw new Error('Not attached');

    const result = await this.session.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });

    return result.result.value;
  }

  async interceptNetwork(patterns: string[]): Promise<void> {
    if (!this.session) throw new Error('Not attached');

    await this.session.send('Network.setRequestInterception', {
      patterns: patterns.map((p) => ({ urlPattern: p })),
    });
  }
}
