import type {
  Provider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@bab/protocol';
import { EventBus } from './event-bus.js';
import { randomUUID } from 'node:crypto';

export class Router {
  private providers = new Map<string, Provider>();
  private activeProviderId: string | null = null;

  constructor(private eventBus: EventBus) {}

  registerProvider(provider: Provider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" already registered`);
    }
    this.providers.set(provider.id, provider);
    this.eventBus.emit('provider.connected', { providerId: provider.id });
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      this.activeProviderId = null;
    }
    this.eventBus.emit('provider.disconnected', { providerId: id });
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  listProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider "${id}" not found`);
    }
    this.activeProviderId = id;
  }

  getActiveProvider(): Provider {
    if (!this.activeProviderId) {
      throw new Error('No active provider set');
    }
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      throw new Error(`Active provider "${this.activeProviderId}" not found`);
    }
    return provider;
  }

  async route(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = this.getActiveProvider();
    const requestId = randomUUID();

    this.eventBus.emit('request.received', {
      requestId,
      model: request.model,
    });

    const startTime = Date.now();

    try {
      const response = await provider.send(request);

      this.eventBus.emit('request.completed', {
        requestId,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.eventBus.emit('request.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async *routeStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const provider = this.getActiveProvider();
    const requestId = randomUUID();

    this.eventBus.emit('request.received', {
      requestId,
      model: request.model,
    });

    const startTime = Date.now();

    try {
      yield* provider.stream(request);

      this.eventBus.emit('request.completed', {
        requestId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.eventBus.emit('request.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
