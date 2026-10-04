import type { LoggingConfig } from '@bab/protocol';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface LoggerOptions extends LoggingConfig {
  context?: string;
  /** Optional file path — every log line is appended there too. */
  filePath?: string;
}

export class Logger {
  private level: LoggingConfig['level'];
  private format: LoggingConfig['format'];
  private context?: string;
  private filePath?: string;

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
    this.filePath = options.filePath;
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

    this.writeToFile(output);
  }

  private logJson(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...data,
    };

    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }

    this.writeToFile(output);
  }

  private writeToFile(line: string): void {
    if (!this.filePath) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, line + '\n');
    } catch {
      // Logging must never crash the process.
    }
  }
}
