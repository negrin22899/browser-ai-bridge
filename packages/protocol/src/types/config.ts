import type { ToolScope } from './tool.js';

export interface AppConfig {
  server: ServerConfig;
  providers: ProviderConfigEntry[];
  runtime: RuntimeConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
  cors: boolean;
  endpoints: {
    chat: string;      // /v1/chat/completions
    responses: string;  // /v1/responses
    models: string;     // /models
  };
}

export interface ProviderConfigEntry {
  id: string;
  type: 'playwright' | 'extension';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface RuntimeConfig {
  workingDirectory: string;
  permissions: PermissionConfig;
}

export interface PermissionConfig {
  mode: 'scope' | 'ask-always' | 'policy';
  defaultScope: ToolScope;
  dangerousTools: string[];
}

export interface SecurityConfig {
  noTokenStorage: boolean;
  auditLogging: boolean;
  scopeRestrictions: boolean;
  maxSessionDuration: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  auditFile?: string;
}
