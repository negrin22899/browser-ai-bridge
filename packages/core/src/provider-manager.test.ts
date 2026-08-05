import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderManager } from './provider-manager.js';
import { EventBus } from './event-bus.js';
import type { Provider, ProviderStatus, HealthCheckResult } from '@bab/protocol';

function createMockProvider(id: string, status: ProviderStatus = 'idle'): Provider {
  return {
    id,
    name: `Provider ${id}`,
    type: 'api',
    status,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    stream: vi.fn(),
    health: vi.fn().mockResolvedValue({ healthy: true }),
    cancel: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
  };
}

describe('ProviderManager', () => {
  let manager: ProviderManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new ProviderManager(eventBus);
  });

  describe('Registration', () => {
    it('should register a provider', () => {
      const provider = createMockProvider('gemini');
      manager.register(provider);

      expect(manager.has('gemini')).toBe(true);
      expect(manager.count()).toBe(1);
    });

    it('should register multiple providers', () => {
      manager.register(createMockProvider('gemini'));
      manager.register(createMockProvider('chatgpt'));
      manager.register(createMockProvider('claude'));

      expect(manager.count()).toBe(3);
    });

    it('should throw when registering duplicate provider', () => {
      manager.register(createMockProvider('gemini'));

      expect(() => manager.register(createMockProvider('gemini'))).toThrow('already registered');
    });

    it('should emit provider.connected event', () => {
      const handler = vi.fn();
      eventBus.on('provider.connected', handler);

      manager.register(createMockProvider('gemini'));

      expect(handler).toHaveBeenCalledWith({ providerId: 'gemini' });
    });

    it('should auto-set first provider as active', () => {
      const provider = createMockProvider('gemini');
      manager.register(provider);

      expect(manager.getActiveId()).toBe('gemini');
      expect(manager.getActive()).toBe(provider);
    });
  });

  describe('Unregistration', () => {
    it('should unregister a provider', () => {
      manager.register(createMockProvider('gemini'));
      manager.unregister('gemini');

      expect(manager.has('gemini')).toBe(false);
      expect(manager.count()).toBe(0);
    });

    it('should throw when unregistering non-existent provider', () => {
      expect(() => manager.unregister('nonexistent')).toThrow('not found');
    });

    it('should emit provider.disconnected event', () => {
      const handler = vi.fn();
      eventBus.on('provider.disconnected', handler);

      manager.register(createMockProvider('gemini'));
      manager.unregister('gemini');

      expect(handler).toHaveBeenCalledWith({ providerId: 'gemini' });
    });

    it('should switch active provider when active is unregistered', () => {
      manager.register(createMockProvider('gemini'));
      manager.register(createMockProvider('chatgpt'));

      manager.unregister('gemini');

      expect(manager.getActiveId()).toBe('chatgpt');
    });

    it('should set active to null when last provider is unregistered', () => {
      manager.register(createMockProvider('gemini'));
      manager.unregister('gemini');

      expect(manager.getActiveId()).toBeNull();
    });
  });

  describe('Retrieval', () => {
    it('should get provider by id', () => {
      const provider = createMockProvider('gemini');
      manager.register(provider);

      expect(manager.get('gemini')).toBe(provider);
    });

    it('should return undefined for non-existent provider', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });

    it('should list all providers', () => {
      manager.register(createMockProvider('gemini'));
      manager.register(createMockProvider('chatgpt'));

      const list = manager.list();
      expect(list).toHaveLength(2);
    });

    it('should check if provider exists', () => {
      manager.register(createMockProvider('gemini'));

      expect(manager.has('gemini')).toBe(true);
      expect(manager.has('nonexistent')).toBe(false);
    });

    it('should get provider count', () => {
      expect(manager.count()).toBe(0);

      manager.register(createMockProvider('gemini'));
      expect(manager.count()).toBe(1);

      manager.register(createMockProvider('chatgpt'));
      expect(manager.count()).toBe(2);
    });
  });

  describe('Active Provider', () => {
    it('should get active provider', () => {
      const provider = createMockProvider('gemini');
      manager.register(provider);

      expect(manager.getActive()).toBe(provider);
    });

    it('should throw when no active provider', () => {
      expect(() => manager.getActive()).toThrow('No active provider');
    });

    it('should set active provider', () => {
      manager.register(createMockProvider('gemini'));
      manager.register(createMockProvider('chatgpt'));

      manager.setActive('chatgpt');

      expect(manager.getActiveId()).toBe('chatgpt');
    });

    it('should throw when setting non-existent provider as active', () => {
      expect(() => manager.setActive('nonexistent')).toThrow('not found');
    });

    it('should get active provider id', () => {
      manager.register(createMockProvider('gemini'));

      expect(manager.getActiveId()).toBe('gemini');
    });
  });

  describe('Filtering', () => {
    it('should get providers by status', () => {
      manager.register(createMockProvider('gemini', 'idle'));
      manager.register(createMockProvider('chatgpt', 'busy'));
      manager.register(createMockProvider('claude', 'idle'));

      const idleProviders = manager.getByStatus('idle');
      expect(idleProviders).toHaveLength(2);
    });

    it('should get providers by type', () => {
      manager.register({ ...createMockProvider('gemini'), type: 'browser' });
      manager.register({ ...createMockProvider('chatgpt'), type: 'api' });
      manager.register({ ...createMockProvider('claude'), type: 'browser' });

      const browserProviders = manager.getByType('browser');
      expect(browserProviders).toHaveLength(2);
    });

    it('should return empty array for non-matching status', () => {
      manager.register(createMockProvider('gemini', 'idle'));

      const busyProviders = manager.getByStatus('busy');
      expect(busyProviders).toHaveLength(0);
    });
  });

  describe('Health Check', () => {
    it('should check health of all providers', async () => {
      const provider1 = createMockProvider('gemini');
      const provider2 = createMockProvider('chatgpt');

      manager.register(provider1);
      manager.register(provider2);

      const results = await manager.healthCheckAll();

      expect(results.size).toBe(2);
      expect(results.get('gemini')).toEqual({ healthy: true });
      expect(results.get('chatgpt')).toEqual({ healthy: true });
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all providers', async () => {
      const provider1 = createMockProvider('gemini');
      const provider2 = createMockProvider('chatgpt');

      manager.register(provider1);
      manager.register(provider2);

      await manager.shutdownAll();

      expect(provider1.disconnect).toHaveBeenCalled();
      expect(provider2.disconnect).toHaveBeenCalled();
      expect(manager.count()).toBe(0);
      expect(manager.getActiveId()).toBeNull();
    });
  });
});
