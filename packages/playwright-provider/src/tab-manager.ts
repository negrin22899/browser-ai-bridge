import type { Browser, Page } from 'playwright-core';
import { BrowserSession } from './browser-session.js';

/**
 * Tab Manager - manages multiple browser tabs/sessions
 */
export class TabManager {
  private sessions = new Map<string, BrowserSession>();
  private activeSessionId: string | null = null;
  private browser: Browser | null = null;

  constructor(browser?: Browser) {
    this.browser = browser ?? null;
  }

  setBrowser(browser: Browser): void {
    this.browser = browser;
  }

  async createSession(id?: string): Promise<BrowserSession> {
    if (!this.browser) {
      throw new Error('Browser not connected');
    }

    const sessionId = id ?? `session-${Date.now()}`;
    const page = await this.browser.newPage();
    const session = new BrowserSession(sessionId);
    await session.attach(page);

    this.sessions.set(sessionId, session);
    
    if (!this.activeSessionId) {
      this.activeSessionId = sessionId;
    }

    return session;
  }

  getSession(id: string): BrowserSession | undefined {
    return this.sessions.get(id);
  }

  getActiveSession(): BrowserSession | undefined {
    if (!this.activeSessionId) return undefined;
    return this.sessions.get(this.activeSessionId);
  }

  setActiveSession(id: string): void {
    if (!this.sessions.has(id)) {
      throw new Error(`Session "${id}" not found`);
    }
    this.activeSessionId = id;
  }

  listSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  async closeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;

    await session.close();
    this.sessions.delete(id);

    if (this.activeSessionId === id) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.sessions.values()).map(s => s.close());
    await Promise.all(closePromises);
    this.sessions.clear();
    this.activeSessionId = null;
  }

  count(): number {
    return this.sessions.size;
  }
}
