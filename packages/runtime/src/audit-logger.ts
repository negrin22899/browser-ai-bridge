import type { AuditLogger as IAuditLogger, AuditEntry } from '@bab/protocol';

export class AuditLogger implements IAuditLogger {
  private entries = new Map<string, AuditEntry[]>();

  log(entry: AuditEntry): void {
    if (!this.entries.has(entry.sessionId)) {
      this.entries.set(entry.sessionId, []);
    }
    this.entries.get(entry.sessionId)!.push(entry);
  }

  getEntries(sessionId: string): AuditEntry[] {
    return this.entries.get(sessionId) ?? [];
  }

  clear(sessionId: string): void {
    this.entries.delete(sessionId);
  }
}
