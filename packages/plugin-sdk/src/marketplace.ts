import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CatalogEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  /** Local directory or git URL. */
  source: string;
  sourceType: 'local' | 'git';
}

export interface InstallResult {
  entry: CatalogEntry;
  installedTo: string;
}

function defaultTargetDir(): string {
  return path.join(os.homedir(), '.bab', 'plugins');
}

/** Plugins shipped with the repo, available out of the box. */
function builtinCatalog(): CatalogEntry[] {
  const base = (name: string, description: string): CatalogEntry => ({
    id: name,
    name,
    version: '1.0.0',
    description,
    source: path.resolve('plugins', name),
    sourceType: 'local',
  });

  return [
    base('provider-gemini', 'Google Gemini provider via browser automation'),
    base('provider-chatgpt', 'ChatGPT provider via browser automation'),
    base('provider-claude', 'Claude provider via browser automation'),
    base('provider-deepseek', 'DeepSeek provider via browser automation'),
  ];
}

/**
 * PluginMarketplace — catalog of installable plugins plus a simple installer.
 *
 * Plugins install into `~/.bab/plugins` (also scanned by PluginLoader). Sources
 * are either a local directory or a git URL; a remote registry is the natural
 * next step but is deliberately kept out of scope for now.
 */
export class PluginMarketplace {
  private readonly targetDir: string;
  private readonly catalog: CatalogEntry[];

  constructor(options?: { targetDir?: string; catalog?: CatalogEntry[] }) {
    this.targetDir = options?.targetDir ?? defaultTargetDir();
    this.catalog = options?.catalog ?? builtinCatalog();
  }

  /** List all plugins known to the marketplace. */
  available(): CatalogEntry[] {
    return [...this.catalog];
  }

  /** Find a catalog entry by id, name or source. */
  find(query: string): CatalogEntry | undefined {
    return this.catalog.find((entry) =>
      entry.id === query || entry.name === query || entry.source === query
    );
  }

  /**
   * Install a plugin from the catalog (by id/name) or from an arbitrary source
   * (local dir or git URL). Returns where it was installed.
   */
  async install(query: string): Promise<InstallResult> {
    const fromCatalog = this.find(query);
    const source = fromCatalog?.source ?? query;
    const sourceType = fromCatalog?.sourceType ?? detectSourceType(query);
    const name = fromCatalog?.name ?? deriveName(query);

    fs.mkdirSync(this.targetDir, { recursive: true });
    const installedTo = path.join(this.targetDir, name);

    if (fs.existsSync(installedTo)) {
      throw new Error(`Plugin "${name}" is already installed at ${installedTo}`);
    }

    if (sourceType === 'git') {
      await execFileAsync('git', ['clone', '--depth', '1', source, installedTo]);
    } else {
      if (!fs.existsSync(source)) {
        throw new Error(`Plugin source not found: ${source}`);
      }
      copyDir(source, installedTo);
    }

    const entry: CatalogEntry = fromCatalog ?? {
      id: name,
      name,
      version: 'unknown',
      description: '',
      source,
      sourceType,
    };
    return { entry, installedTo };
  }
}

function detectSourceType(source: string): 'local' | 'git' {
  const isGit = /^(https?:\/\/|git@|ssh:\/\/)/.test(source) || source.endsWith('.git');
  return isGit ? 'git' : 'local';
}

function deriveName(source: string): string {
  const cleaned = source.replace(/\/+$/, '').replace(/\.git$/, '');
  return path.basename(cleaned) || 'plugin';
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}
