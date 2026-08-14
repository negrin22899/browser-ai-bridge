/**
 * Credential Boundary - Redaction utilities
 * 
 * BAB does NOT store credentials.
 * This module provides redaction for sensitive data before logging/recording.
 */

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /(?:api[_-]?key|token|secret|password|passwd|pwd|auth|credential|access[_-]?key)\s*[=:]\s*["']?([^\s"']+)/gi,
  // Bearer tokens
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  // AWS keys
  /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
  // Private keys
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  // Basic auth
  /basic\s+[a-zA-Z0-9+/]+=*/gi,
  // URLs with credentials
  /(?:https?|ftp):\/\/[^:]+:[^@]+@/gi,
  // Cookie values
  /(?:cookie|set-cookie)\s*[:=]\s*["']?([^;"\s]+)/gi,
  // Common env var patterns
  /(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|AWS_SECRET_ACCESS_KEY|DATABASE_URL|REDIS_URL)\s*[=:]\s*["']?([^\s"']+)/gi,
];

// Fields that should always be redacted
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'auth',
  'authorization',
  'credential',
  'private_key',
  'privateKey',
];

/**
 * Redact sensitive data from a string
 */
export function redactString(str: string): string {
  let result = str;

  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // Keep the key/label, redact the value
      const eqIndex = match.indexOf('=');
      const colonIndex = match.indexOf(':');
      const splitIndex = eqIndex !== -1 ? eqIndex : colonIndex;

      if (splitIndex !== -1) {
        return match.slice(0, splitIndex + 1) + ' [REDACTED]';
      }
      return '[REDACTED]';
    });
  }

  return result;
}

/**
 * Redact sensitive fields from an object
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactString(value);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'string' ? redactString(item) :
          typeof item === 'object' && item !== null ? redactObject(item as Record<string, unknown>) :
          item
        );
      } else {
        result[key] = redactObject(value as Record<string, unknown>);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Redact sensitive data from any value
 */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(item => redact(item));
    }
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

/**
 * Check if a string contains sensitive data
 */
export function containsSensitiveData(str: string): boolean {
  // Reset lastIndex for global regexes before testing
  return SENSITIVE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(str);
  });
}

/**
 * Sanitize error messages to remove sensitive data
 */
export function sanitizeError(error: Error): Error {
  const sanitized = new Error(redactString(error.message));
  sanitized.name = error.name;
  sanitized.stack = error.stack ? redactString(error.stack) : undefined;
  return sanitized;
}
