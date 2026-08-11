/**
 * Graceful Shutdown Handler
 * 
 * Handles graceful shutdown of the application.
 */

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
}

export class ShutdownManager {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;

  /**
   * Register a shutdown handler
   */
  register(handler: ShutdownHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Execute all shutdown handlers
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down gracefully...');

    // Execute handlers in reverse order
    for (const handler of this.handlers.reverse()) {
      try {
        console.log(`  Shutting down ${handler.name}...`);
        await handler.handler();
        console.log(`  ${handler.name} shut down successfully`);
      } catch (error) {
        console.error(`  Error shutting down ${handler.name}:`, error);
      }
    }

    console.log('Shutdown complete');
  }

  /**
   * Check if shutting down
   */
  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }
}

/**
 * Setup process signal handlers
 */
export function setupSignalHandlers(manager: ShutdownManager): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT');
    await manager.shutdown();
    process.exit(0);
  });

  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM');
    await manager.shutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await manager.shutdown();
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    await manager.shutdown();
    process.exit(1);
  });
}

/**
 * Create a shutdown manager with signal handlers
 */
export function createShutdownManager(): ShutdownManager {
  const manager = new ShutdownManager();
  setupSignalHandlers(manager);
  return manager;
}
