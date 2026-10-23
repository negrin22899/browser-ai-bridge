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

  /**
   * Reuse an already-open tab whose URL matches any of the patterns
   * (substring match). Falls back to the first non-blank http(s) page
   * when only one such page exists. Returns null when nothing fits.
   */
  private findExistingPage(urlPatterns: string[]): Page | null {
    if (!this.browser) return null;
    const contexts = this.browser.contexts();
    const pages: Page[] = [];
    for (const ctx of contexts) {
      for (const page of ctx.pages()) pages.push(page);
    }
    if (pages.length === 0) return null;

    const needles = urlPatterns.map((p) => p.toLowerCase());
    for (const page of pages) {
      const url = (page.url() || '').toLowerCase();
      if (!url || url === 'about:blank') continue;
      if (needles.some((n) => url.includes(n))) return page;
    }

    // Single real page — user likely has the provider open without a
    // distinctive URL fragment we know about. Prefer it over a new tab.
    const real = pages.filter((p) => {
      const u = p.url() || '';
      return u && u !== 'about:blank' && !u.startsWith('chrome://') && !u.startsWith('edge://');
    });
    return real.length === 1 ? real[0] : null;
  }

  async createSession(id?: string, opts?: { urlPatterns?: string[] }): Promise<BrowserSession> {
    if (!this.browser) {
      throw new Error('Browser not connected');
    }

    const sessionId = id ?? `session-${Date.now()}`;
    let page: Page;

    const existing = opts?.urlPatterns?.length ? this.findExistingPage(opts.urlPatterns) : null;
    if (existing) {
      console.log('[tabs] Reusing existing tab:', existing.url());
      page = existing;
    } else {
      page = await this.browser.newPage();
    }

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
