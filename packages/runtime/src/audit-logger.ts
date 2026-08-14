import type { AuditLogger as IAuditLogger, AuditEntry } from '@bab/protocol';

const DEFAULT_MAX_ENTRIES = 1000;

export class AuditLogger implements IAuditLogger {
  private entries = new Map<string, AuditEntry[]>();
  private maxEntries: number;

  constructor(maxEntries?: number) {
    this.maxEntries = maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  log(entry: AuditEntry): void {
    if (!this.entries.has(entry.sessionId)) {
      this.entries.set(entry.sessionId, []);
    }

    const sessionEntries = this.entries.get(entry.sessionId)!;
    sessionEntries.push(entry);

    // Evict oldest entries when limit is exceeded
    if (sessionEntries.length > this.maxEntries) {
      const excess = sessionEntries.length - this.maxEntries;
      sessionEntries.splice(0, excess);
    }
  }

  getEntries(sessionId: string): AuditEntry[] {
    return this.entries.get(sessionId) ?? [];
  }

  clear(sessionId: string): void {
    this.entries.delete(sessionId);
  }

  size(): number {
    let total = 0;
    for (const entries of this.entries.values()) {
      total += entries.length;
    }
    return total;
  }
}
