import { spawn } from 'node:child_process';
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
 * DockerRuntimeProvider - executes operations in Docker containers
 * 
 * Architecture:
 * Tool → Permission → DockerRuntimeProvider → Container → Execution
 * 
 * Supports:
 * - Container creation/start
 * - Workspace mount
 * - Command execution
 * - Filesystem operations
 * - Environment variables
 * - Health checks
 * - Cleanup
 */
export class DockerRuntimeProvider implements RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata = {
    id: 'docker',
    name: 'Docker Runtime',
    version: '1.0.0',
    type: 'docker',
    description: 'Execute operations in Docker containers',
  };

  readonly capabilities: RuntimeCapabilities = {
    filesystemRead: true,
    filesystemWrite: true,
    processExecute: true,
    network: false, // Restricted by default
    git: true,
    shell: true,
    maxConcurrent: 5,
    maxExecutionTime: 60000,
  };

  private _state: RuntimeState = {
    state: 'disconnected',
    timestamp: Date.now(),
  };

  private workspace: string = '';
  private containerName: string = '';
  private image: string = 'node:20';
  private startTime: number = 0;

  get state(): RuntimeState {
    return { ...this._state };
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async connect(options?: RuntimeConnectOptions): Promise<void> {
    this._state = { state: 'connecting', timestamp: Date.now() };
    this.startTime = Date.now();
    this.workspace = options?.workspace ?? '/workspace';
    this.image = options?.docker?.image ?? 'node:20';
    this.containerName = options?.docker?.containerName ?? `bab-${randomUUID().slice(0, 8)}`;

    try {
      // Check if Docker is available
      await this.checkDockerAvailable();

      // Create and start container
      await this.createContainer(options);

      this._state = { state: 'connected', timestamp: Date.now() };
      this._state = { state: 'ready', timestamp: Date.now() };
    } catch (error) {
      this._state = {
        state: 'disconnected',
        timestamp: Date.now(),
        error: {
          code: 'RUNTIME_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Docker connection failed',
          recoverable: true,
          original: error,
        },
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Stop and remove container
      await this.executeDockerCommand('stop', [this.containerName]).catch(() => {});
      await this.executeDockerCommand('rm', [this.containerName]).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }

    this._state = { state: 'disconnected', timestamp: Date.now() };
  }

  isConnected(): boolean {
    return this._state.state === 'ready';
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
      // Check container is running
      const result = await this.executeDockerCommand('inspect', [
        '--format', '{{.State.Running}}',
        this.containerName,
      ]);

      const isRunning = result.stdout.trim() === 'true';

      return {
        healthy: isRunning,
        state: isRunning ? 'ready' : 'disconnected',
        latency,
      };
    } catch {
      return {
        healthy: false,
        state: 'disconnected',
        latency,
        error: {
          code: 'RUNTIME_UNAVAILABLE',
          message: 'Container health check failed',
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
        message: 'Docker runtime not connected',
        recoverable: true,
      } as RuntimeError;
    }

    const executionId = command.executionId ?? randomUUID();
    const startTime = Date.now();
    const timeout = command.timeout ?? this.capabilities.maxExecutionTime ?? 60000;

    try {
      const args = ['exec', this.containerName];

      // Add environment variables
      if (command.env) {
        for (const [key, value] of Object.entries(command.env)) {
          args.push('-e', `${key}=${value}`);
        }
      }

      // Add working directory
      if (command.cwd) {
        args.push('-w', command.cwd);
      }

      // Add command
      args.push('sh', '-c', [command.command, ...(command.args ?? [])].join(' '));

      const result = await this.executeDockerCommandWithTimeout(args, timeout);

      return {
        executionId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        cancelled: false,
      };
    } catch (error) {
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

  async cancel(_executionId: string): Promise<void> {
    // Note: Cannot easily cancel Docker exec without PID
  }

  // ============================================================================
  // FILESYSTEM
  // ============================================================================

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);

    try {
      const result = await this.execute({
        command: 'cat',
        args: [fullPath],
      });

      if (result.exitCode !== 0) {
        throw {
          code: 'FILE_READ_ERROR',
          message: `Failed to read file: ${filePath}`,
          recoverable: true,
        } as RuntimeError;
      }

      return result.stdout;
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

    try {
      // Create directory if needed
      const dir = path.dirname(fullPath);
      await this.execute({
        command: 'mkdir',
        args: ['-p', dir],
      });

      // Write file using echo with heredoc
      const result = await this.execute({
        command: 'sh',
        args: ['-c', `cat > "${fullPath}" << 'BABEL_EOF'\n${content}\nBABEL_EOF`],
      });

      if (result.exitCode !== 0) {
        throw {
          code: 'FILE_WRITE_ERROR',
          message: `Failed to write file: ${filePath}`,
          recoverable: true,
        } as RuntimeError;
      }
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
    try {
      const result = await this.execute({
        command: 'test',
        args: ['-f', this.resolvePath(filePath)],
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const fullPath = this.resolvePath(dirPath);

    try {
      const result = await this.execute({
        command: 'ls',
        args: ['-la', fullPath],
      });

      if (result.exitCode !== 0) {
        return [];
      }

      // Parse ls output
      const entries: DirectoryEntry[] = [];
      const lines = result.stdout.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          const name = parts.slice(8).join(' ');
          if (name === '.' || name === '..') continue;

          entries.push({
            name,
            path: path.join(fullPath, name),
            isDirectory: parts[0].startsWith('d'),
            isFile: parts[0].startsWith('-'),
          });
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    try {
      await this.execute({
        command: 'rm',
        args: ['-f', fullPath],
      });
    } catch (error) {
      throw {
        code: 'FILE_WRITE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete file',
        recoverable: true,
      } as RuntimeError;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);

    try {
      await this.execute({
        command: 'mkdir',
        args: ['-p', fullPath],
      });
    } catch (error) {
      throw {
        code: 'FILE_WRITE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create directory',
        recoverable: true,
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
    return filePath.startsWith(this.workspace);
  }

  resolvePath(...segments: string[]): string {
    if (segments.length === 0) return this.workspace;
    const joined = path.join(...segments);
    if (path.isAbsolute(joined)) return joined;
    return path.join(this.workspace, joined);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async checkDockerAvailable(): Promise<void> {
    try {
      await this.executeLocalCommand('docker', ['--version']);
    } catch {
      throw new Error('Docker is not installed or not running');
    }
  }

  private async createContainer(options?: RuntimeConnectOptions): Promise<void> {
    const volumes = options?.docker?.volumes ?? [];
    const args = ['run', '-d', '--name', this.containerName];

    // Mount workspace
    args.push('-v', `${this.workspace}:/workspace`);

    // Mount additional volumes
    for (const vol of volumes) {
      args.push('-v', `${vol.host}:${vol.container}`);
    }

    // Keep container running
    args.push(this.image, 'sleep', 'infinity');

    await this.executeLocalCommand('docker', args);
  }

  private async executeLocalCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { shell: true });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          reject(new Error(`Command failed: ${stderr.trim() || stdout.trim()}`));
        }
      });

      proc.on('error', reject);
    });
  }

  private async executeDockerCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return this.executeLocalCommand('docker', [command, ...args]);
  }

  private async executeDockerCommandWithTimeout(args: string[], timeout: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('docker', args, { shell: true, timeout });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

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
    });
  }
}
