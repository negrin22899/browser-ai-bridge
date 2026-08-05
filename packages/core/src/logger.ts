import type { LoggingConfig } from '@bab/protocol';

interface LoggerOptions extends LoggingConfig {
  context?: string;
}

export class Logger {
  private level: LoggingConfig['level'];
  private format: LoggingConfig['format'];
  private context?: string;

  private levels: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.format = options.format;
    this.context = options.context;
  }

  child(name: string): Logger {
    const childContext = this.context
      ? `${this.context}:${name}`
      : name;

    return new Logger({
      level: this.level,
      format: this.format,
      context: childContext,
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  private log(level: LoggingConfig['level'], message: string, data?: Record<string, unknown>): void {
    if (this.levels[level] < this.levels[this.level]) return;

    if (this.format === 'json') {
      this.logJson(level, message, data);
    } else {
      this.logText(level, message, data);
    }
  }

  private logText(level: string, message: string, _data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const output = `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;

    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  private logJson(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...data,
    };

    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}
