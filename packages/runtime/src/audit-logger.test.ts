import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from './audit-logger.js';
import type { AuditEntry } from '@bab/protocol';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  it('should log audit entries', () => {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      sessionId: 'session-1',
      toolName: 'fs.read',
      params: { path: '/tmp/test' },
      result: 'allowed',
    };

    logger.log(entry);
    expect(logger.getEntries('session-1')).toHaveLength(1);
  });

  it('should get entries for specific session', () => {
    logger.log({ timestamp: Date.now(), sessionId: 'session-1', toolName: 'fs.read', params: {}, result: 'allowed' });
    logger.log({ timestamp: Date.now(), sessionId: 'session-2', toolName: 'fs.write', params: {}, result: 'denied' });

    expect(logger.getEntries('session-1')).toHaveLength(1);
    expect(logger.getEntries('session-2')).toHaveLength(1);
  });

  it('should clear entries for session', () => {
    logger.log({ timestamp: Date.now(), sessionId: 'session-1', toolName: 'fs.read', params: {}, result: 'allowed' });
    logger.clear('session-1');

    expect(logger.getEntries('session-1')).toHaveLength(0);
  });
});
