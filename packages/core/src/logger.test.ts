import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    const logger = new Logger({ level: 'info', format: 'text' });
    logger.info('test message');

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('test message');
  });

  it('should not log debug when level is info', () => {
    const logger = new Logger({ level: 'info', format: 'text' });
    logger.debug('debug message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log debug when level is debug', () => {
    const logger = new Logger({ level: 'debug', format: 'text' });
    logger.debug('debug message');

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should include context in log output', () => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'TestModule' });
    logger.info('test message');

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[TestModule]');
  });

  it('should create child logger with additional context', () => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'Parent' });
    const child = logger.child('Child');
    child.info('test message');

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[Parent:Child]');
  });

  it('should output JSON format when configured', () => {
    const logger = new Logger({ level: 'info', format: 'json' });
    logger.info('test message', { key: 'value' });

    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.key).toBe('value');
  });
});
