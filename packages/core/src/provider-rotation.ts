import type {
  Provider,
  ProviderStatus,
  ProviderType,
  ProviderCapabilities,
  HealthCheckResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ToolDescription,
} from '@bab/protocol';

const BLOCK_PATTERN = /auth_required|rate_limited|captcha|blocked/i;

/** True when an error signals the provider (account) should be rotated away. */
export function isBlockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return BLOCK_PATTERN.test(message);
}

/**
 * ProviderRotation — wraps several providers of the same family (e.g. multiple
 * browser profiles/accounts) and fails over between them.
 *
 * A provider that is in an `error` state is skipped, and a thrown block error
 * (auth/rate-limit/CAPTCHA) advances to the next account on the next request.
 */
export class ProviderRotation implements Provider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;

  private providers: Provider[];
  private activeIndex = 0;

  constructor(id: string, providers: Provider[], options?: { name?: string; type?: ProviderType }) {
    if (providers.length === 0) {
      throw new Error('ProviderRotation requires at least one provider');
    }
    this.id = id;
    this.name = options?.name ?? id;
    this.type = options?.type ?? providers[0].type;
    this.providers = providers;
  }

  get status(): ProviderStatus {
    if (this.providers.some((p) => p.status === 'connected')) return 'connected';
    if (this.providers.some((p) => p.status === 'busy')) return 'busy';
    if (this.providers.every((p) => p.status === 'disconnected')) return 'disconnected';
    if (this.providers.every((p) => p.status === 'error')) return 'error';
    return 'disconnected';
  }

  async connect(): Promise<void> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        await provider.connect();
      } catch (error) {
        lastError = error;
      }
    }
    if (!this.providers.some((p) => p.status === 'connected') && lastError) {
      throw lastError;
    }
  }

  async disconnect(): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }
  }

  private next(): Provider {
    for (let offset = 0; offset < this.providers.length; offset++) {
      const index = (this.activeIndex + offset) % this.providers.length;
      const candidate = this.providers[index];
      if (candidate.status !== 'error') {
        this.activeIndex = index;
        return candidate;
      }
    }
    // All errored — fall back to the first one and let it surface the error.
    return this.providers[0];
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const attempts = this.providers.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const provider = this.next();
      try {
        const response = await provider.send(request);
        this.activeIndex = this.providers.indexOf(provider);
        return response;
      } catch (error) {
        lastError = error;
        if (!isBlockError(error)) throw error;
        // Advance past the blocked provider on the next iteration.
        this.activeIndex = (this.providers.indexOf(provider) + 1) % this.providers.length;
      }
    }

    throw lastError;
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const provider = this.next();
    yield* provider.stream(request);
  }

  async health(): Promise<HealthCheckResult> {
    const results = await Promise.all(this.providers.map((p) => p.health().catch(() => ({ healthy: false }))));
    const healthyCount = results.filter((r) => r.healthy).length;
    return {
      healthy: healthyCount > 0,
      details: {
        accounts: this.providers.length,
        healthy: healthyCount,
        activeIndex: this.activeIndex,
      },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return this.providers[0].getCapabilities();
  }

  getTools(): ToolDescription[] {
    return this.providers[0].getTools?.() ?? [];
  }

  setTools(tools: ToolDescription[]): void {
    for (const provider of this.providers) {
      (provider as unknown as { setTools?: (t: ToolDescription[]) => void }).setTools?.(tools);
    }
  }

  cancel(): void {
    for (const provider of this.providers) {
      try {
        provider.cancel();
      } catch {
        // Ignore cancel errors.
      }
    }
  }
}
