export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  cleanupIntervalMs?: number;
}

export interface RateLimitInfo {
  total: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<RateLimitConfig>) {
    this.windowMs = config?.windowMs ?? 60000;
    this.maxRequests = config?.maxRequests ?? 60;

    // Auto-cleanup expired entries every 2 minutes
    const cleanupInterval = config?.cleanupIntervalMs ?? 120_000;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
    this.cleanupTimer.unref();
  }

  check(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    let entry = this.requests.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + this.windowMs };
      this.requests.set(key, entry);
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        info: { total: this.maxRequests, remaining: 0, reset: entry.resetTime },
      };
    }

    entry.count++;
    return {
      allowed: true,
      info: {
        total: this.maxRequests,
        remaining: this.maxRequests - entry.count,
        reset: entry.resetTime,
      },
    };
  }

  getInfo(key: string): RateLimitInfo {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now >= entry.resetTime) {
      return { total: this.maxRequests, remaining: this.maxRequests, reset: now + this.windowMs };
    }

    return {
      total: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      reset: entry.resetTime,
    };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  clearAll(): void {
    this.requests.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests) {
      if (now >= entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requests.clear();
  }
}
