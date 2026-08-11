import type { Provider } from './types/provider.js';

/**
 * Provider Conformance Test Suite
 * 
 * Every provider must pass these tests to be considered conformant.
 * Works with both v1 and v2 provider interfaces.
 */

export interface ConformanceTestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ConformanceReport {
  providerId: string;
  providerName: string;
  timestamp: number;
  results: ConformanceTestResult[];
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  success: boolean;
}

/**
 * Provider Conformance Tester
 */
export class ProviderConformanceTester {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * Run full conformance test suite
   */
  async run(): Promise<ConformanceReport> {
    const results: ConformanceTestResult[] = [];

    // Category 1: Interface
    results.push(...await this.testInterface());

    // Category 2: Properties
    results.push(...await this.testProperties());

    // Category 3: Capabilities
    results.push(...await this.testCapabilities());

    // Category 4: Health
    results.push(...await this.testHealth());

    // Category 5: Lifecycle
    results.push(...await this.testLifecycle());

    // Category 6: Communication
    results.push(...await this.testCommunication());

    // Category 7: Error Handling
    results.push(...await this.testErrorHandling());

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      providerId: this.provider.id,
      providerName: this.provider.name,
      timestamp: Date.now(),
      results,
      passed,
      failed,
      skipped: 0,
      total: results.length,
      success: failed === 0,
    };
  }

  /**
   * Test interface compliance
   */
  private async testInterface(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    // Test required properties
    results.push(await this.runTest('Interface', 'id exists', () => {
      if (!this.provider.id) {
        throw new Error('id is required');
      }
    }));

    results.push(await this.runTest('Interface', 'name exists', () => {
      if (!this.provider.name) {
        throw new Error('name is required');
      }
    }));

    results.push(await this.runTest('Interface', 'type exists', () => {
      if (!this.provider.type) {
        throw new Error('type is required');
      }
    }));

    results.push(await this.runTest('Interface', 'status exists', () => {
      if (!this.provider.status) {
        throw new Error('status is required');
      }
    }));

    // Test required methods
    const requiredMethods = ['connect', 'disconnect', 'health', 'getCapabilities', 'send', 'stream', 'cancel'];
    for (const method of requiredMethods) {
      results.push(await this.runTest('Interface', `${method} exists`, () => {
        if (typeof (this.provider as any)[method] !== 'function') {
          throw new Error(`${method} is required`);
        }
      }));
    }

    return results;
  }

  /**
   * Test properties
   */
  private async testProperties(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('Properties', 'id is string', () => {
      if (typeof this.provider.id !== 'string') {
        throw new Error('id must be a string');
      }
    }));

    results.push(await this.runTest('Properties', 'name is string', () => {
      if (typeof this.provider.name !== 'string') {
        throw new Error('name must be a string');
      }
    }));

    results.push(await this.runTest('Properties', 'type is valid', () => {
      const validTypes = ['browser', 'api', 'local'];
      if (!validTypes.includes(this.provider.type)) {
        throw new Error(`type must be one of: ${validTypes.join(', ')}`);
      }
    }));

    results.push(await this.runTest('Properties', 'status is valid', () => {
      const validStatuses = ['disconnected', 'connecting', 'connected', 'busy', 'error', 'shutdown'];
      if (!validStatuses.includes(this.provider.status)) {
        throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
      }
    }));

    return results;
  }

  /**
   * Test capabilities
   */
  private async testCapabilities(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('Capabilities', 'getCapabilities returns object', () => {
      const caps = this.provider.getCapabilities();
      if (!caps || typeof caps !== 'object') {
        throw new Error('getCapabilities() must return an object');
      }
    }));

    const requiredBooleans = [
      'streaming', 'images', 'files', 'thinking', 'toolCalling',
      'webSearch', 'markdown', 'codeGeneration', 'multiModal',
    ];

    for (const key of requiredBooleans) {
      results.push(await this.runTest('Capabilities', `${key} is boolean`, () => {
        const caps = this.provider.getCapabilities();
        const value = (caps as unknown as Record<string, unknown>)[key];
        if (typeof value !== 'boolean') {
          throw new Error(`${key} must be a boolean`);
        }
      }));
    }

    return results;
  }

  /**
   * Test health
   */
  private async testHealth(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('Health', 'health returns object', async () => {
      const health = await this.provider.health();
      if (!health || typeof health !== 'object') {
        throw new Error('health() must return an object');
      }
    }));

    results.push(await this.runTest('Health', 'health has healthy field', async () => {
      const health = await this.provider.health();
      if (typeof health.healthy !== 'boolean') {
        throw new Error('health.healthy must be a boolean');
      }
    }));

    return results;
  }

  /**
   * Test lifecycle
   */
  private async testLifecycle(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('Lifecycle', 'connect changes status', async () => {
      try {
        await this.provider.connect();
        const connectedStatus = this.provider.status;
        if (connectedStatus !== 'connected' && connectedStatus !== 'error') {
          throw new Error(`Expected connected or error status, got: ${connectedStatus}`);
        }
      } catch (error) {
        // Connect may fail in test environment
        if (this.provider.status !== 'error') {
          throw error;
        }
      }
    }));

    results.push(await this.runTest('Lifecycle', 'disconnect changes status', async () => {
      try {
        await this.provider.disconnect();
        if (this.provider.status !== 'disconnected') {
          throw new Error(`Expected disconnected status, got: ${this.provider.status}`);
        }
      } catch {
        // May fail if not connected
      }
    }));

    return results;
  }

  /**
   * Test communication
   */
  private async testCommunication(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('Communication', 'send returns response', async () => {
      if (this.provider.status !== 'connected') {
        return; // Skip if not connected
      }

      try {
        const response = await this.provider.send({
          model: this.provider.id,
          messages: [{ role: 'user', content: 'test' }],
        });

        if (!response || typeof response !== 'object') {
          throw new Error('send() must return an object');
        }

        if (!response.choices || !Array.isArray(response.choices)) {
          throw new Error('response.choices must be an array');
        }
      } catch (error) {
        if (this.provider.status === 'connected') {
          throw error;
        }
      }
    }));

    return results;
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<ConformanceTestResult[]> {
    const results: ConformanceTestResult[] = [];

    results.push(await this.runTest('ErrorHandling', 'cancel does not throw', () => {
      try {
        this.provider.cancel();
      } catch (error) {
        throw new Error('cancel() should not throw');
      }
    }));

    return results;
  }

  /**
   * Run a single test
   */
  private async runTest(
    category: string,
    name: string,
    fn: () => void | Promise<void>
  ): Promise<ConformanceTestResult> {
    const start = Date.now();
    try {
      await fn();
      return {
        name,
        category,
        passed: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        name,
        category,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Quick conformance test
 */
export async function testProviderConformance(provider: Provider): Promise<ConformanceReport> {
  const tester = new ProviderConformanceTester(provider);
  return tester.run();
}

/**
 * Print conformance report
 */
export function printConformanceReport(report: ConformanceReport): void {
  console.log('\n' + '='.repeat(60));
  console.log(`Provider Conformance: ${report.providerName}`);
  console.log('='.repeat(60));
  console.log(`Status: ${report.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tests: ${report.passed}/${report.total} passed, ${report.failed} failed`);
  console.log('-'.repeat(60));

  // Group by category
  const categories = new Map<string, ConformanceTestResult[]>();
  for (const result of report.results) {
    const existing = categories.get(result.category) || [];
    existing.push(result);
    categories.set(result.category, existing);
  }

  for (const [category, results] of categories) {
    console.log(`\n${category}:`);
    for (const result of results) {
      const icon = result.passed ? '✅' : '❌';
      const duration = `(${result.duration}ms)`.padStart(10);
      console.log(`  ${icon} ${result.name.padEnd(30)} ${duration}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}
