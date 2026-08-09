export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text';
  context?: string;
  outputs?: LogOutput[];
}

export interface LogOutput {
  write(entry: LogEntry): void;
}

/**
 * Console log output
 */
export class ConsoleOutput implements LogOutput {
  write(entry: LogEntry): void {
    const prefix = `[${LogLevel[entry.level]}]${entry.context ? ` [${entry.context}]` : ''}`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data ?? '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data ?? '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data ?? '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error ?? entry.data ?? '');
        break;
    }
  }
}

/**
 * Memory log output (for testing and debugging)
 */
export class MemoryOutput implements LogOutput {
  private entries: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  write(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

/**
 * Logger - structured logging system
 */
export class Logger {
  private level: LogLevel;
  private format: 'json' | 'text';
  private context?: string;
  private outputs: LogOutput[];

  constructor(config?: Partial<LoggerConfig>) {
    this.level = config?.level ?? LogLevel.INFO;
    this.format = config?.format ?? 'text';
    this.context = config?.context;
    this.outputs = config?.outputs ?? [new ConsoleOutput()];
  }

  /**
   * Create child logger with context
   */
  child(context: string): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      context: this.context ? `${this.context}:${context}` : context,
      outputs: this.outputs,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, error);
    } else {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error): void {
    this.log(LogLevel.FATAL, message, undefined, error);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: this.context,
      data,
      error,
    };

    for (const output of this.outputs) {
      try {
        output.write(entry);
      } catch (err) {
        // Avoid infinite loops
        console.error('Log output error:', err);
      }
    }
  }
}
