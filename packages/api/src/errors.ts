/**
 * Base error class for Browser AI Bridge
 */
export class BABError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BABError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Provider connection error
 */
export class ProviderConnectionError extends BABError {
  constructor(providerId: string, message: string, details?: Record<string, unknown>) {
    super(
      `Provider "${providerId}" connection failed: ${message}`,
      'PROVIDER_CONNECTION_ERROR',
      503,
      { providerId, ...details }
    );
    this.name = 'ProviderConnectionError';
  }
}

/**
 * Provider timeout error
 */
export class ProviderTimeoutError extends BABError {
  constructor(providerId: string, timeout: number) {
    super(
      `Provider "${providerId}" timed out after ${timeout}ms`,
      'PROVIDER_TIMEOUT_ERROR',
      504,
      { providerId, timeout }
    );
    this.name = 'ProviderTimeoutError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends BABError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_ERROR',
      429,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends BABError {
  constructor(message: string, fields?: Record<string, string>) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      { fields }
    );
    this.name = 'ValidationError';
  }
}

/**
 * Plugin error
 */
export class PluginError extends BABError {
  constructor(pluginName: string, message: string, details?: Record<string, unknown>) {
    super(
      `Plugin "${pluginName}" error: ${message}`,
      'PLUGIN_ERROR',
      500,
      { pluginName, ...details }
    );
    this.name = 'PluginError';
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends BABError {
  constructor(toolName: string, message: string, details?: Record<string, unknown>) {
    super(
      `Tool "${toolName}" execution failed: ${message}`,
      'TOOL_EXECUTION_ERROR',
      500,
      { toolName, ...details }
    );
    this.name = 'ToolExecutionError';
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends BABError {
  constructor(toolName: string, reason: string) {
    super(
      `Permission denied for tool "${toolName}": ${reason}`,
      'PERMISSION_DENIED_ERROR',
      403,
      { toolName, reason }
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error handler utility
 */
export function handleError(error: unknown): BABError {
  if (error instanceof BABError) {
    return error;
  }

  if (error instanceof Error) {
    return new BABError(error.message, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new BABError(String(error), 'UNKNOWN_ERROR', 500);
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: BABError): {
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
} {
  return {
    error: {
      message: error.message,
      code: error.code,
      details: error.details,
    },
  };
}
