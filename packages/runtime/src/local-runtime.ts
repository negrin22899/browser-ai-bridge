import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  RuntimeProvider,
  RuntimeProviderMetadata,
  RuntimeState,
  RuntimeCapabilities,
  RuntimeConnectOptions,
  RuntimeCommand,
  RuntimeExecutionResult,
  RuntimeHealthResult,
  DirectoryEntry,
  RuntimeError,
} from './runtime-provider.js';

/**
 * LocalRuntimeProvider - executes operations on the local machine
 * 
 * This is the default Runtime Provider.
 * Tools execute directly on the user's machine.
 */
export class LocalRuntimeProvider implements RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata = {
    id: 'local',
    name: 'Local Runtime',
    version: '1.0.0',
    type: 'local',
    description: 'Execute operations on the local machine',
  };

  readonly capabilities: RuntimeCapabilities = {
    filesystemRead: true,
    filesystemWrite: true,
    processExecute: true,
    network: true,
    git: true,
    shell: true,
    platforms: [process.platform],
    maxConcurrent: 10,
    maxExecutionTime: 30000,
  };

  private _state: RuntimeState = {
    state: 'disconnected',
    timestamp: Date.now(),
  };

  private workspace: string = process.cwd();
  private startTime: number = 0;
  private activeExecutions: Map<string, boolean> = new Map();

  get state(): RuntimeState {
    return { ...this._state };
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async connect(options?: RuntimeConnectOptions): Promise<void> {
    this._state = { state: 'connecting', timestamp: Date.now() };
    this.startTime = Date.now();

    try {
      this.workspace = options?.workspace ?? process.cwd();

      // Verify workspace exists
      if (!fs.existsSync(this.workspace)) {
        throw new Error(`Workspace not found: ${this.workspace}`);
      }

      this._state = { state: 'connected', timestamp: Date.now() };
      this._state = { state: 'ready', timestamp: Date.now() };
    } catch (error) {
      this._state = {
        state: 'disconnected',
        timestamp: Date.now(),
        error: {
          code: 'RUNTIME_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Connection failed',
          recoverable: true,
          original: error,
        },
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Cancel active executions
    for (const [id] of this.activeExecutions) {
      await this.cancel(id);
    }

    this._state = { state: 'disconnected', timestamp: Date.now() };
  }

  isConnected(): boolean {
    return this._state.state === 'ready' || this._state.state === 'connected';
  }

  // ============================================================================
  // HEALTH
  // ============================================================================

  async health(): Promise<RuntimeHealthResult> {
    const latency = Date.now() - this.startTime;

    if (!this.isConnected()) {
      return {
        healthy: false,
        state: this._state.state,
        latency,
        error: this._state.error,
      };
    }

    try {
      // Check workspace accessible
      const workspaceAccessible = fs.existsSync(this.workspace);

      // Get disk space
      let diskSpace;
      try {
        const stats = fs.statfsSync(this.workspace);
        diskSpace = {
          total: stats.blocks * stats.bsize,
          used: (stats.blocks - stats.bavail) * stats.bsize,
          available: stats.bavail * stats.bsize,
        };
      } catch {
        // statfsSync not available on all platforms
      }

      return {
        healthy: workspaceAccessible,
        state: this._state.state,
        latency,
        workspaceAccessible,
        diskSpace,
      };
    } catch (error) {
      return {
        healthy: false,
        state: 'disconnected',
        latency,
        error: {
          code: 'RUNTIME_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Health check failed',
          recoverable: true,
        },
      };
    }
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================

  async execute(command: RuntimeCommand): Promise<RuntimeExecutionResult> {
    if (!this.isConnected()) {
      throw {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'Runtime not connected',
        recoverable: true,
      } as RuntimeError;
    }

    const executionId = command.executionId ?? randomUUID();
    const startTime = Date.now();
    const timeout = command.timeout ?? this.capabilities.maxExecutionTime ?? 30000;

    this.activeExecutions.set(executionId, true);

    try {
      const result = await this.executeCommand(command, timeout);

      this.activeExecutions.delete(executionId);

      return {
        executionId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        cancelled: false,
      };
    } catch (error) {
      this.activeExecutions.delete(executionId);

      return {
        executionId,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        cancelled: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Execution failed',
          recoverable: true,
          original: error,
        },
      };
    }
  }

  async cancel(executionId: string): Promise<void> {
    this.activeExecutions.delete(executionId);
    // Note: Cannot easily cancel spawned processes without storing PID
  }

  // ============================================================================
  // FILESYSTEM
  // ============================================================================

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isInWorkspace(fullPath)) {
      throw {
        code: 'WORKSPACE_VIOLATION',
        message: `Path outside workspace: ${filePath}`,
        recoverable: false,
      } as RuntimeError;
    }

    try {
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw {
        code: 'FILE_READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to read file',
        recoverable: true,
        original: error,
      } as RuntimeError;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isInWorkspace(fullPath)) {
      throw {
        code: 'WORKSPACE_VIOLATION',
        message: `Path outside workspace: ${filePath}`,
        recoverable: false,
      } as RuntimeError;
    }

    try {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf-8');
    } catch (error) {
      throw {
        code: 'FILE_WRITE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to write file',
        recoverable: true,
        original: error,
      } as RuntimeError;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    return fs.existsSync(fullPath);
  }

  async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const fullPath = this.resolvePath(dirPath);

    if (!this.isInWorkspace(fullPath)) {
      throw {
        code: 'WORKSPACE_VIOLATION',
        message: `Path outside workspace: ${dirPath}`,
        recoverable: false,
      } as RuntimeError;
    }

    try {
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        path: path.join(fullPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
    } catch (error) {
      throw {
        code: 'FILE_READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list directory',
        recoverable: true,
        original: error,
      } as RuntimeError;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isInWorkspace(fullPath)) {
      throw {
        code: 'WORKSPACE_VIOLATION',
        message: `Path outside workspace: ${filePath}`,
        recoverable: false,
      } as RuntimeError;
    }

    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      throw {
        code: 'FILE_WRITE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete file',
        recoverable: true,
        original: error,
      } as RuntimeError;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);

    if (!this.isInWorkspace(fullPath)) {
      throw {
        code: 'WORKSPACE_VIOLATION',
        message: `Path outside workspace: ${dirPath}`,
        recoverable: false,
      } as RuntimeError;
    }

    try {
      fs.mkdirSync(fullPath, { recursive: true });
    } catch (error) {
      throw {
        code: 'FILE_WRITE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create directory',
        recoverable: true,
        original: error,
      } as RuntimeError;
    }
  }

  // ============================================================================
  // WORKSPACE
  // ============================================================================

  getWorkspaceRoot(): string {
    return this.workspace;
  }

  isInWorkspace(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    const workspaceResolved = path.resolve(this.workspace);

    // Check direct path
    if (resolved.startsWith(workspaceResolved)) {
      return true;
    }

    // Check for symlinks
    try {
      const realPath = fs.realpathSync(resolved);
      return realPath.startsWith(workspaceResolved);
    } catch {
      return false;
    }
  }

  resolvePath(...segments: string[]): string {
    if (segments.length === 0) {
      return this.workspace;
    }

    const joined = path.join(...segments);

    // If absolute path, return as is
    if (path.isAbsolute(joined)) {
      return joined;
    }

    // Otherwise, resolve relative to workspace
    return path.resolve(this.workspace, joined);
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private async executeCommand(
    command: RuntimeCommand,
    timeout: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const cwd = command.cwd ?? this.workspace;
      const env = { ...process.env, ...command.env };

      const proc = spawn(command.command, command.args ?? [], {
        cwd,
        env,
        shell: true,
        timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.on('close', () => {
        clearTimeout(timer);
      });
    });
  }
}
