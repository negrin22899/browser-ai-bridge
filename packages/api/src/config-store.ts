import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface AppConfig {
  general: {
    serverPort: number;
    autoStart: boolean;
    minimizeToTray: boolean;
  };
  browser: {
    useExistingProfile: boolean;
    headless: boolean;
    defaultTimeout: number;
  };
  security: {
    requireConfirmation: boolean;
    dangerousCommands: string[];
    auditLog: boolean;
  };
  tools: {
    workingDirectory: string;
    maxExecutionTime: number;
    shell: string;
  };
  onboarding: {
    completed: boolean;
    provider?: string;
    model?: string;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  general: {
    serverPort: 3000,
    autoStart: true,
    minimizeToTray: true,
  },
  browser: {
    useExistingProfile: true,
    headless: false,
    defaultTimeout: 30000,
  },
  security: {
    requireConfirmation: true,
    dangerousCommands: ['rm -rf', 'sudo', 'format'],
    auditLog: true,
  },
  tools: {
    workingDirectory: os.homedir(),
    maxExecutionTime: 30000,
    shell: 'bash',
  },
  onboarding: {
    completed: false,
  },
};

/**
 * Simple file-backed config store.
 */
export class ConfigStore {
  private filePath: string;
  private cache: AppConfig;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.join(os.homedir(), '.browser-ai-bridge', 'config.json');
    this.cache = this.load();
  }

  get(): AppConfig {
    return JSON.parse(JSON.stringify(this.cache));
  }

  set(partial: Partial<AppConfig>): AppConfig {
    this.cache = mergeConfig(this.cache, partial);
    this.save();
    return this.get();
  }

  private load(): AppConfig {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        return mergeConfig(DEFAULT_CONFIG, raw);
      }
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to persist config:', error);
    }
  }
}

function mergeConfig(base: AppConfig, partial: Partial<AppConfig>): AppConfig {
  return {
    general: { ...base.general, ...(partial.general ?? {}) },
    browser: { ...base.browser, ...(partial.browser ?? {}) },
    security: { ...base.security, ...(partial.security ?? {}) },
    tools: { ...base.tools, ...(partial.tools ?? {}) },
    onboarding: { ...base.onboarding, ...(partial.onboarding ?? {}) },
  };
}
