import { describe, it, expect } from 'vitest';
import { Config } from './config.js';

describe('Config', () => {
  it('should return default config when no overrides', () => {
    const config = new Config();
    const data = config.get();
    expect(data.server.host).toBe('localhost');
    expect(data.server.port).toBe(3000);
    expect(data.security.noTokenStorage).toBe(true);
  });

  it('should merge partial config with defaults', () => {
    const config = new Config({
      server: { host: '0.0.0.0', port: 8080, cors: false, endpoints: { chat: '/chat', responses: '/resp', models: '/models' } },
    });

    const result = config.get();
    expect(result.server.host).toBe('0.0.0.0');
    expect(result.server.port).toBe(8080);
    expect(result.logging.level).toBe('info');
  });

  it('should get nested value by path', () => {
    const config = new Config();
    expect(config.get('server.port')).toBe(3000);
    expect(config.get('logging.level')).toBe('info');
  });

  it('should set nested value by path', () => {
    const config = new Config();
    config.set('server.port', 8080);
    expect(config.get('server.port')).toBe(8080);
  });

  it('should throw for invalid path', () => {
    const config = new Config();
    expect(() => config.get('invalid.path.here')).toThrow();
  });
});
