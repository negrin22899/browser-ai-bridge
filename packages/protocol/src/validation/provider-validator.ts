import type { Provider } from '../types/provider.js';
import type { ProviderCapabilities } from '../types/capabilities.js';
import type { ChatCompletionRequest } from '../types/message.js';

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  method: string;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Full validation report
 */
export interface ValidationReport {
  providerId: string;
  providerName: string;
  timestamp: number;
  results: ValidationResult[];
  passed: number;
  failed: number;
  total: number;
  success: boolean;
}

/**
 * Provider Validation Suite
 * 
 * Tests that any Provider implementation correctly implements the interface.
 * 
 * Usage:
 * ```typescript
 * const validator = new ProviderValidator(myProvider);
 * const report = await validator.validate();
 * console.log(report.success ? 'PASS' : 'FAIL');
 * ```
 */
export class ProviderValidator {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * Run full validation suite
   */
  async validate(): Promise<ValidationReport> {
    const results: ValidationResult[] = [];

    // Test 1: Interface compliance
    results.push(await this.validateInterface());

    // Test 2: Capabilities
    results.push(await this.validateCapabilities());

    // Test 3: Health check
    results.push(await this.validateHealth());

    // Test 4: Connect
    results.push(await this.validateConnect());

    // Test 5: Send (only if connected)
    if (this.provider.status === 'connected') {
      results.push(await this.validateSend());
      results.push(await this.validateStream());
    }

    // Test 6: Disconnect
    results.push(await this.validateDisconnect());

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      providerId: this.provider.id,
      providerName: this.provider.name,
      timestamp: Date.now(),
      results,
      passed,
      failed,
      total: results.length,
      success: failed === 0,
    };
  }

  /**
   * Validate interface compliance
   */
  private async validateInterface(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const required = ['id', 'name', 'type', 'status', 'connect', 'disconnect', 'send', 'stream', 'health', 'getCapabilities', 'cancel'];
      const missing: string[] = [];

      for (const prop of required) {
        if (!(prop in this.provider)) {
          missing.push(prop);
        }
      }

      if (missing.length > 0) {
        return {
          passed: false,
          method: 'interface',
          duration: Date.now() - startTime,
          error: `Missing required properties: ${missing.join(', ')}`,
        };
      }

      return {
        passed: true,
        method: 'interface',
        duration: Date.now() - startTime,
        details: {
          id: this.provider.id,
          name: this.provider.name,
          type: this.provider.type,
        },
      };
    } catch (error) {
      return {
        passed: false,
        method: 'interface',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate capabilities
   */
  private async validateCapabilities(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const capabilities = this.provider.getCapabilities();

      if (!capabilities || typeof capabilities !== 'object') {
        return {
          passed: false,
          method: 'capabilities',
          duration: Date.now() - startTime,
          error: 'getCapabilities() must return an object',
        };
      }

      const requiredBooleans = ['streaming', 'images', 'files', 'thinking', 'toolCalling', 'webSearch', 'markdown', 'codeGeneration', 'multiModal'];
      const missing: string[] = [];

      for (const key of requiredBooleans) {
        if (typeof capabilities[key as keyof ProviderCapabilities] !== 'boolean') {
          missing.push(key);
        }
      }

      if (missing.length > 0) {
        return {
          passed: false,
          method: 'capabilities',
          duration: Date.now() - startTime,
          error: `Missing required capability fields: ${missing.join(', ')}`,
        };
      }

      return {
        passed: true,
        method: 'capabilities',
        duration: Date.now() - startTime,
        details: capabilities as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        passed: false,
        method: 'capabilities',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate health check
   */
  private async validateHealth(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const health = await this.provider.health();

      if (!health || typeof health !== 'object') {
        return {
          passed: false,
          method: 'health',
          duration: Date.now() - startTime,
          error: 'health() must return an object',
        };
      }

      if (typeof health.healthy !== 'boolean') {
        return {
          passed: false,
          method: 'health',
          duration: Date.now() - startTime,
          error: 'health.healthy must be a boolean',
        };
      }

      return {
        passed: true,
        method: 'health',
        duration: Date.now() - startTime,
        details: health as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        passed: false,
        method: 'health',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate connect
   */
  private async validateConnect(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      await this.provider.connect();

      if (this.provider.status !== 'connected') {
        return {
          passed: false,
          method: 'connect',
          duration: Date.now() - startTime,
          error: `Expected status 'connected', got '${this.provider.status}'`,
        };
      }

      return {
        passed: true,
        method: 'connect',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        passed: false,
        method: 'connect',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate send
   */
  private async validateSend(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const request: ChatCompletionRequest = {
        model: 'test',
        messages: [{ role: 'user', content: 'Say "test" and nothing else.' }],
      };

      const response = await this.provider.send(request);

      if (!response || typeof response !== 'object') {
        return {
          passed: false,
          method: 'send',
          duration: Date.now() - startTime,
          error: 'send() must return an object',
        };
      }

      if (!response.id || !response.object || !response.choices) {
        return {
          passed: false,
          method: 'send',
          duration: Date.now() - startTime,
          error: 'Response missing required fields (id, object, choices)',
        };
      }

      if (!Array.isArray(response.choices) || response.choices.length === 0) {
        return {
          passed: false,
          method: 'send',
          duration: Date.now() - startTime,
          error: 'Response choices must be a non-empty array',
        };
      }

      return {
        passed: true,
        method: 'send',
        duration: Date.now() - startTime,
        details: {
          responseId: response.id,
          choiceCount: response.choices.length,
          hasContent: !!response.choices[0]?.message?.content,
        },
      };
    } catch (error) {
      return {
        passed: false,
        method: 'send',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate stream
   */
  private async validateStream(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const request: ChatCompletionRequest = {
        model: 'test',
        messages: [{ role: 'user', content: 'Say "test" and nothing else.' }],
        stream: true,
      };

      const chunks: any[] = [];
      for await (const chunk of this.provider.stream(request)) {
        chunks.push(chunk);
        if (chunks.length >= 5) break; // Limit chunks for validation
      }

      if (chunks.length === 0) {
        return {
          passed: false,
          method: 'stream',
          duration: Date.now() - startTime,
          error: 'stream() must yield at least one chunk',
        };
      }

      for (const chunk of chunks) {
        if (!chunk.id || !chunk.object || !chunk.choices) {
          return {
            passed: false,
            method: 'stream',
            duration: Date.now() - startTime,
            error: 'Chunk missing required fields (id, object, choices)',
          };
        }
      }

      return {
        passed: true,
        method: 'stream',
        duration: Date.now() - startTime,
        details: {
          chunkCount: chunks.length,
        },
      };
    } catch (error) {
      return {
        passed: false,
        method: 'stream',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate disconnect
   */
  private async validateDisconnect(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      await this.provider.disconnect();

      if (this.provider.status !== 'disconnected') {
        return {
          passed: false,
          method: 'disconnect',
          duration: Date.now() - startTime,
          error: `Expected status 'disconnected', got '${this.provider.status}'`,
        };
      }

      return {
        passed: true,
        method: 'disconnect',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        passed: false,
        method: 'disconnect',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Quick validation function
 */
export async function validateProvider(provider: Provider): Promise<ValidationReport> {
  const validator = new ProviderValidator(provider);
  return validator.validate();
}

/**
 * Print validation report
 */
export function printValidationReport(report: ValidationReport): void {
  console.log('\n' + '='.repeat(60));
  console.log(`Provider Validation: ${report.providerName}`);
  console.log('='.repeat(60));
  console.log(`Status: ${report.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tests: ${report.passed}/${report.total} passed`);
  console.log('─'.repeat(60));

  for (const result of report.results) {
    const icon = result.passed ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    console.log(`${icon} ${result.method.padEnd(20)} ${duration.padStart(8)}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('='.repeat(60) + '\n');
}
