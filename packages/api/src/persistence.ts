import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Message, AuditEntry } from '@bab/protocol';

export interface PersistedSession {
  id: string;
  providerId: string;
  model?: string;
  createdAt: number;
  messages: Message[];
}

export interface PersistedState {
  sessions: PersistedSession[];
  audit: Record<string, AuditEntry[]>;
  activeSessionId: string | null;
}

/**
 * Minimal file-backed store for sessions and audit log.
 * Writes atomically (tmp + rename) so a crash never corrupts state.
 */
export class StatePersistence {
  constructor(private filePath: string) {}

  load(): PersistedState | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        return {
          sessions: parsed.sessions ?? [],
          audit: parsed.audit ?? {},
          activeSessionId: parsed.activeSessionId ?? null,
        };
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
    return null;
  }

  save(state: PersistedState): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
}
