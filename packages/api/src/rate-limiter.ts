export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitInfo {
  total: number;
  remaining: number;
  reset: number;
}

/**
 * Rate Limiter - token bucket implementation
 */
export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config?: Partial<RateLimitConfig>) {
    this.windowMs = config?.windowMs ?? 60000; // 1 minute
    this.maxRequests = config?.maxRequests ?? 60; // 60 requests per minute
  }

  /**
   * Check if request is allowed
   */
  check(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    let entry = this.requests.get(key);

    // Create new entry if doesn't exist or window expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.requests.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        info: {
          total: this.maxRequests,
          remaining: 0,
          reset: entry.resetTime,
        },
      };
    }

    // Increment count
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

  /**
   * Get rate limit info for a key
   */
  getInfo(key: string): RateLimitInfo {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now >= entry.resetTime) {
      return {
        total: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
      };
    }

    return {
      total: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      reset: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests) {
      if (now >= entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}
