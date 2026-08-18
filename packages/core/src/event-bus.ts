import type { EventMap, EventHandler } from '@bab/protocol';

export class EventBus {
  private listeners = new Map<string, Set<EventHandler<unknown>>>();
  private anyListeners = new Set<(event: string, data: unknown) => void>();

  /**
   * Subscribe to every event (useful for streaming/SSE forwarders).
   * Returns an unsubscribe function.
   */
  onAny(handler: (event: string, data: unknown) => void): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  on<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  once<K extends keyof EventMap & string>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const wrapper: EventHandler<EventMap[K]> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  }

  emit<K extends keyof EventMap & string>(
    event: K,
    data: EventMap[K]
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventBus error in handler for "${event}":`, error);
        }
      }
    }

    for (const listener of this.anyListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error(`EventBus error in wildcard handler for "${event}":`, error);
      }
    }
  }

  async emitAsync<K extends keyof EventMap & string>(
    event: K,
    data: EventMap[K]
  ): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      promises.push(
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`EventBus async error in handler for "${event}":`, error);
        })
      );
    }
    await Promise.all(promises);
  }

  removeAllListeners(): void {
    this.listeners.clear();
    this.anyListeners.clear();
  }
}
