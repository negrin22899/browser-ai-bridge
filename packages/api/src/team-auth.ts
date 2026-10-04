import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomBytes, createHash } from 'node:crypto';

export type ClientRole = 'admin' | 'member';

/** Public, non-secret view of a client (never includes the key). */
export interface ClientCredential {
  id: string;
  name: string;
  role: ClientRole;
  keyHint: string;
  createdAt: number;
}

/** Identity attached to a request after successful authentication. */
export interface ClientIdentity {
  id: string;
  name: string;
  role: ClientRole;
}

interface StoredClient {
  id: string;
  name: string;
  role: ClientRole;
  keyHash: string;
  createdAt: number;
}

function generateKey(): string {
  return `bab-${randomBytes(18).toString('hex')}`;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function toCredential(client: StoredClient): ClientCredential {
  return {
    id: client.id,
    name: client.name,
    role: client.role,
    keyHint: `${client.name.slice(0, 1).toUpperCase()}-${client.keyHash.slice(0, 6)}`,
    createdAt: client.createdAt,
  };
}

/**
 * TeamAuth — API-key authentication with a two-role RBAC model.
 *
 * - `admin`: full access (sees every client's sessions).
 * - `member`: access limited to sessions the member created.
 *
 * Keys are stored as SHA-256 hashes (never plaintext). When team mode is
 * enabled (`clients.length > 0`), every request except `/health` must carry a
 * valid `Authorization: Bearer <key>` header.
 */
export class TeamAuth {
  private clients = new Map<string, StoredClient>();
  private filePath: string;

  constructor(options?: { filePath?: string; clients?: Array<{ name: string; role: ClientRole; key: string }> }) {
    this.filePath = options?.filePath ?? path.join(os.homedir(), '.browser-ai-bridge', 'team.json');
    this.load();

    for (const client of options?.clients ?? []) {
      this.ensure(client.name, client.role, client.key);
    }
  }

  /** True when at least one client exists, i.e. auth is enforced. */
  get enabled(): boolean {
    return this.clients.size > 0;
  }

  authenticate(authHeader: string | undefined): ClientIdentity | null {
    const key = parseBearer(authHeader);
    if (!key) return null;

    const hash = hashKey(key);
    for (const client of this.clients.values()) {
      if (client.keyHash === hash) {
        return { id: client.id, name: client.name, role: client.role };
      }
    }
    return null;
  }

  /** Create a client. The raw key is returned exactly once — store it now. */
  create(name: string, role: ClientRole = 'member'): { credential: ClientCredential; key: string } {
    const key = generateKey();
    return { credential: this.addClient(name, role, key), key };
  }

  /**
   * Add a client with a known key unless that key already exists (idempotent,
   * used when the admin supplies a key via flag/env). Returns null on dup.
   */
  ensure(name: string, role: ClientRole, key: string): { credential: ClientCredential; key: string } | null {
    const keyHash = hashKey(key);
    for (const client of this.clients.values()) {
      if (client.keyHash === keyHash) return null;
    }
    return { credential: this.addClient(name, role, key), key };
  }

  revoke(id: string): boolean {
    const removed = this.clients.delete(id);
    if (removed) this.save();
    return removed;
  }

  list(): ClientCredential[] {
    return Array.from(this.clients.values())
      .map(toCredential)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  private addClient(name: string, role: ClientRole, key: string): ClientCredential {
    const client: StoredClient = {
      id: `cl-${randomBytes(8).toString('hex')}`,
      name,
      role,
      keyHash: hashKey(key),
      createdAt: Date.now(),
    };
    this.persistClient(client);
    return toCredential(client);
  }

  private persistClient(client: StoredClient): void {
    this.clients.set(client.id, client);
    this.save();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      const clients = Array.isArray(raw?.clients) ? raw.clients : [];
      for (const client of clients) {
        if (client?.id && client?.keyHash) {
          this.clients.set(client.id, client as StoredClient);
        }
      }
    } catch (error) {
      console.error('Failed to load team clients:', error);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const data = { version: 1, clients: Array.from(this.clients.values()) };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist team clients:', error);
    }
  }
}
