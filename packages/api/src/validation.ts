/**
 * Request Validation - validates incoming API requests
 */

export interface ValidationConfig {
  maxBodySize: number; // bytes
  maxMessages: number;
  maxMessageLength: number;
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxBodySize: 1024 * 1024, // 1MB
  maxMessages: 100,
  maxMessageLength: 100000, // 100KB
};

export class RequestValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate request body size
   */
  validateBodySize(body: string | null): { valid: boolean; error?: string } {
    if (!body) {
      return { valid: false, error: 'Request body is required' };
    }

    if (body.length > this.config.maxBodySize) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${this.config.maxBodySize} bytes`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate chat completion request
   */
  validateChatRequest(request: unknown): { valid: boolean; error?: string } {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request format' };
    }

    const req = request as Record<string, unknown>;

    // Check model
    if (!req.model || typeof req.model !== 'string') {
      return { valid: false, error: 'model is required and must be a string' };
    }

    // Check messages
    if (!req.messages || !Array.isArray(req.messages)) {
      return { valid: false, error: 'messages is required and must be an array' };
    }

    if (req.messages.length > this.config.maxMessages) {
      return {
        valid: false,
        error: `Too many messages. Maximum: ${this.config.maxMessages}`,
      };
    }

    // Validate each message
    for (let i = 0; i < req.messages.length; i++) {
      const msg = req.messages[i];
      if (!msg || typeof msg !== 'object') {
        return { valid: false, error: `Message ${i} is invalid` };
      }

      if (!msg.role || typeof msg.role !== 'string') {
        return { valid: false, error: `Message ${i} role is required` };
      }

      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        return { valid: false, error: `Message ${i} role must be system, user, or assistant` };
      }

      if (msg.content && typeof msg.content === 'string') {
        if (msg.content.length > this.config.maxMessageLength) {
          return {
            valid: false,
            error: `Message ${i} too long. Maximum: ${this.config.maxMessageLength} characters`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get config
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}
