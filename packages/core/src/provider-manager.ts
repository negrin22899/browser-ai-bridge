import type {
  Provider,
  ProviderManager as IProviderManager,
  ProviderStatus,
  ProviderType,
  HealthCheckResult,
} from '@bab/protocol';
import { EventBus } from './event-bus.js';

export class ProviderManager implements IProviderManager {
  private providers = new Map<string, Provider>();
  private activeProviderId: string | null = null;

  constructor(private eventBus: EventBus) {}

  register(provider: Provider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" already registered`);
    }

    this.providers.set(provider.id, provider);
    this.eventBus.emit('provider.connected', { providerId: provider.id });

    // Set as active if it's the first provider
    if (this.providers.size === 1) {
      this.activeProviderId = provider.id;
    }
  }

  unregister(id: string): void {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider "${id}" not found`);
    }

    this.providers.delete(id);
    this.eventBus.emit('provider.disconnected', { providerId: id });

    // If this was the active provider, switch to another one
    if (this.activeProviderId === id) {
      const remaining = Array.from(this.providers.keys());
      this.activeProviderId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  get(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  list(): Provider[] {
    return Array.from(this.providers.values());
  }

  getActive(): Provider {
    if (!this.activeProviderId) {
      throw new Error('No active provider set');
    }

    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      throw new Error(`Active provider "${this.activeProviderId}" not found`);
    }

    return provider;
  }

  getActiveOrNull(): Provider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) ?? null;
  }

  setActive(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider "${id}" not found`);
    }

    this.activeProviderId = id;
  }

  getActiveId(): string | null {
    return this.activeProviderId;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  count(): number {
    return this.providers.size;
  }

  getByStatus(status: ProviderStatus): Provider[] {
    return this.list().filter((p) => p.status === status);
  }

  getByType(type: ProviderType): Provider[] {
    return this.list().filter((p) => p.type === type);
  }

  async healthCheckAll(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();

    const healthChecks = Array.from(this.providers.entries()).map(async ([id, provider]) => {
      try {
        const result = await provider.health();
        results.set(id, result);
      } catch (error) {
        results.set(id, {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(healthChecks);
    return results;
  }

  async shutdownAll(): Promise<void> {
    const shutdownPromises = this.list().map(async (p) => {
      try {
        await p.disconnect();
      } catch {
        // Ignore errors during shutdown
      }
    });

    await Promise.all(shutdownPromises);
    this.providers.clear();
    this.activeProviderId = null;
  }
}
