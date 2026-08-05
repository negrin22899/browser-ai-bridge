import type { AppConfig } from '@bab/protocol';

const defaultConfig: AppConfig = {
  server: {
    host: 'localhost',
    port: 3000,
    cors: true,
    endpoints: {
      chat: '/v1/chat/completions',
      responses: '/v1/responses',
      models: '/models',
    },
  },
  providers: [],
  runtime: {
    workingDirectory: process.cwd(),
    permissions: {
      mode: 'scope',
      defaultScope: {
        allowedPaths: [process.cwd()],
        allowedCommands: ['git status', 'git diff'],
        deniedCommands: ['rm -rf', 'sudo'],
        maxExecutionTime: 30000,
      },
      dangerousTools: ['shell.exec'],
    },
  },
  security: {
    noTokenStorage: true,
    auditLogging: true,
    scopeRestrictions: true,
    maxSessionDuration: 3600000,
  },
  logging: { level: 'info', format: 'text' },
};

export class Config {
  private data: AppConfig;

  constructor(partial?: Partial<AppConfig>) {
    this.data = this.deepMerge(defaultConfig, partial ?? {}) as AppConfig;
  }

  get(): AppConfig;
  get<T>(path: string): T;
  get(path?: string): unknown {
    if (!path) return this.data;
    return this.getByPath(this.data as unknown as Record<string, unknown>, path);
  }

  set(path: string, value: unknown): void {
    this.setByPath(this.data as unknown as Record<string, unknown>, path, value);
  }

  private getByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(`Invalid config path: ${path}`);
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (this.isObject(target) && this.isObject(source)) {
      const result = { ...target } as Record<string, unknown>;
      for (const key of Object.keys(source as Record<string, unknown>)) {
        if (this.isObject((source as Record<string, unknown>)[key])) {
          if (!(key in result)) {
            result[key] = (source as Record<string, unknown>)[key];
          } else {
            result[key] = this.deepMerge(
              result[key],
              (source as Record<string, unknown>)[key]
            );
          }
        } else {
          result[key] = (source as Record<string, unknown>)[key];
        }
      }
      return result;
    }
    return source;
  }

  private isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }
}
