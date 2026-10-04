import { spawn } from 'node:child_process';
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
  RuntimeError,
  DirectoryEntry,
} from './runtime-provider.js';

interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function run(executable: string, args: string[], timeoutMs = 30000): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args, { shell: false, timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseLs(output: string, basePath: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  for (const line of output.split('\n')) {
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;
    const name = parts.slice(8).join(' ');
    if (name === '.' || name === '..') continue;
    entries.push({
      name,
      path: `${basePath}/${name}`,
      isDirectory: parts[0].startsWith('d'),
      isFile: parts[0].startsWith('-'),
    });
  }
  return entries;
}

/**
 * WSLRuntimeProvider — executes operations in Windows Subsystem for Linux.
 */
export class WSLRuntimeProvider implements RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata = {
    id: 'wsl',
    name: 'WSL Runtime',
    version: '1.0.0',
    type: 'wsl',
    description: 'Execute operations in Windows Subsystem for Linux',
  };

  readonly capabilities: RuntimeCapabilities = {
    filesystemRead: true,
    filesystemWrite: true,
    processExecute: true,
    network: true,
    git: true,
    shell: true,
    maxConcurrent: 5,
    maxExecutionTime: 30000,
  };

  private _state: RuntimeState = { state: 'disconnected', timestamp: Date.now() };
  private workspace = '/mnt/c/projects';
  private distribution: string | undefined;
  private startTime = 0;

  get state(): RuntimeState {
    return { ...this._state };
  }

  private wslArgs(script: string): string[] {
    const args: string[] = [];
    if (this.distribution) args.push('-d', this.distribution);
    args.push('-e', 'sh', '-c', script);
    return args;
  }

  private async runInWsl(script: string, timeoutMs?: number): Promise<SpawnResult> {
    return run('wsl', this.wslArgs(script), timeoutMs);
  }

  async connect(options?: RuntimeConnectOptions): Promise<void> {
    this._state = { state: 'connecting', timestamp: Date.now() };
    this.startTime = Date.now();
    this.workspace = options?.workspace ?? '/mnt/c/projects';
    this.distribution = options?.wsl?.distribution;

    try {
      await this.runInWsl('echo ok', 10000);
      this._state = { state: 'ready', timestamp: Date.now() };
    } catch (error) {
      this._state = {
        state: 'disconnected',
        timestamp: Date.now(),
        error: {
          code: 'RUNTIME_UNAVAILABLE',
          message: 'WSL is not installed or not available',
          recoverable: false,
          original: error,
        },
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._state = { state: 'disconnected', timestamp: Date.now() };
  }

  isConnected(): boolean {
    return this._state.state === 'ready';
  }

  async health(): Promise<RuntimeHealthResult> {
    if (!this.isConnected()) {
      return {
        healthy: false,
        state: this._state.state,
        latency: Date.now() - this.startTime,
        error: this._state.error,
      };
    }
    try {
      const r = await this.runInWsl('pwd', 5000);
      return {
        healthy: r.exitCode === 0,
        state: r.exitCode === 0 ? 'ready' : 'disconnected',
        latency: Date.now() - this.startTime,
      };
    } catch {
      return { healthy: false, state: 'disconnected', latency: Date.now() - this.startTime };
    }
  }

  async execute(command: RuntimeCommand): Promise<RuntimeExecutionResult> {
    if (!this.isConnected()) {
      throw {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'WSL runtime not connected',
        recoverable: true,
      } as RuntimeError;
    }

    const executionId = command.executionId ?? randomUUID();
    const started = Date.now();
    const timeout = command.timeout ?? this.capabilities.maxExecutionTime ?? 30000;
    const script = [command.command, ...(command.args ?? [])].join(' ');

    try {
      const r = await this.runInWsl(script, timeout);
      return {
        executionId,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        duration: Date.now() - started,
        cancelled: false,
      };
    } catch (error) {
      return {
        executionId,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - started,
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

  async cancel(_executionId: string): Promise<void> {}

  async readFile(filePath: string): Promise<string> {
    const r = await this.execute({ command: 'cat', args: [this.resolvePath(filePath)] });
    if (r.exitCode !== 0) {
      throw { code: 'FILE_READ_ERROR', message: r.stderr || 'Failed to read file', recoverable: true } as RuntimeError;
    }
    return r.stdout;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const full = this.resolvePath(filePath);
    const r = await this.execute({
      command: 'sh',
      args: ['-c', `mkdir -p "$(dirname "${full}")" && cat > "${full}" << 'BAB_EOF'\n${content}\nBAB_EOF`],
    });
    if (r.exitCode !== 0) {
      throw { code: 'FILE_WRITE_ERROR', message: r.stderr || 'Failed to write file', recoverable: true } as RuntimeError;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const r = await this.execute({ command: 'test', args: ['-e', this.resolvePath(filePath)] });
    return r.exitCode === 0;
  }

  async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const r = await this.execute({ command: 'ls', args: ['-la', this.resolvePath(dirPath)] });
    if (r.exitCode !== 0) return [];
    return parseLs(r.stdout, this.resolvePath(dirPath));
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.execute({ command: 'rm', args: ['-rf', this.resolvePath(filePath)] });
  }

  async createDirectory(dirPath: string): Promise<void> {
    await this.execute({ command: 'mkdir', args: ['-p', this.resolvePath(dirPath)] });
  }

  getWorkspaceRoot(): string { return this.workspace; }
  isInWorkspace(filePath: string): boolean { return filePath.startsWith(this.workspace); }
  resolvePath(...segments: string[]): string {
    if (segments.length === 0) return this.workspace;
    const joined = segments.join('/');
    return joined.startsWith('/') ? joined : `${this.workspace}/${joined}`;
  }
}

/**
 * SSHRuntimeProvider — executes operations on remote machines via SSH.
 */
export class SSHRuntimeProvider implements RuntimeProvider {
  readonly metadata: RuntimeProviderMetadata = {
    id: 'ssh',
    name: 'SSH Runtime',
    version: '1.0.0',
    type: 'ssh',
    description: 'Execute operations on remote machines via SSH',
  };

  readonly capabilities: RuntimeCapabilities = {
    filesystemRead: true,
    filesystemWrite: true,
    processExecute: true,
    network: true,
    git: true,
    shell: true,
    maxConcurrent: 3,
    maxExecutionTime: 60000,
  };

  private _state: RuntimeState = { state: 'disconnected', timestamp: Date.now() };
  private workspace = '/home/user/project';
  private host = '';
  private username = '';
  private port: number | undefined;
  private privateKeyPath: string | undefined;
  private startTime = 0;

  get state(): RuntimeState {
    return { ...this._state };
  }

  private sshArgs(script: string): string[] {
    const args: string[] = ['-o', 'BatchMode=yes'];
    if (this.port) args.push('-p', String(this.port));
    if (this.privateKeyPath) args.push('-i', this.privateKeyPath);
    args.push(`${this.username}@${this.host}`, script);
    return args;
  }

  async connect(options?: RuntimeConnectOptions): Promise<void> {
    this._state = { state: 'connecting', timestamp: Date.now() };
    this.startTime = Date.now();
    this.workspace = options?.workspace ?? '/home/user/project';
    this.host = options?.ssh?.host ?? '';
    this.username = options?.ssh?.username ?? 'root';
    this.port = options?.ssh?.port;
    this.privateKeyPath = options?.ssh?.privateKeyPath;

    if (!this.host) {
      this._state = {
        state: 'disconnected',
        timestamp: Date.now(),
        error: { code: 'NETWORK_ERROR', message: 'SSH host is required', recoverable: false },
      };
      throw new Error('SSH host is required');
    }

    try {
      await run('ssh', this.sshArgs('echo ok'), 10000);
      this._state = { state: 'ready', timestamp: Date.now() };
    } catch (error) {
      this._state = {
        state: 'disconnected',
        timestamp: Date.now(),
        error: {
          code: 'NETWORK_ERROR',
          message: 'SSH connection failed',
          recoverable: true,
          original: error,
        },
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._state = { state: 'disconnected', timestamp: Date.now() };
  }

  isConnected(): boolean {
    return this._state.state === 'ready';
  }

  async health(): Promise<RuntimeHealthResult> {
    if (!this.isConnected()) {
      return {
        healthy: false,
        state: this._state.state,
        latency: Date.now() - this.startTime,
        error: this._state.error,
      };
    }
    try {
      const r = await run('ssh', this.sshArgs('pwd'), 5000);
      return {
        healthy: r.exitCode === 0,
        state: r.exitCode === 0 ? 'ready' : 'disconnected',
        latency: Date.now() - this.startTime,
      };
    } catch {
      return { healthy: false, state: 'disconnected', latency: Date.now() - this.startTime };
    }
  }

  async execute(command: RuntimeCommand): Promise<RuntimeExecutionResult> {
    if (!this.isConnected()) {
      throw {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'SSH runtime not connected',
        recoverable: true,
      } as RuntimeError;
    }

    const executionId = command.executionId ?? randomUUID();
    const started = Date.now();
    const timeout = command.timeout ?? this.capabilities.maxExecutionTime ?? 60000;
    const script = [command.command, ...(command.args ?? [])].join(' ');

    try {
      const r = await run('ssh', this.sshArgs(script), timeout);
      return {
        executionId,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        duration: Date.now() - started,
        cancelled: false,
      };
    } catch (error) {
      return {
        executionId,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - started,
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

  async cancel(_executionId: string): Promise<void> {}

  async readFile(filePath: string): Promise<string> {
    const r = await this.execute({ command: 'cat', args: [this.resolvePath(filePath)] });
    if (r.exitCode !== 0) {
      throw { code: 'FILE_READ_ERROR', message: r.stderr || 'Failed to read file', recoverable: true } as RuntimeError;
    }
    return r.stdout;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const full = this.resolvePath(filePath);
    const r = await this.execute({
      command: 'sh',
      args: ['-c', `mkdir -p "$(dirname "${full}")" && cat > "${full}" << 'BAB_EOF'\n${content}\nBAB_EOF`],
    });
    if (r.exitCode !== 0) {
      throw { code: 'FILE_WRITE_ERROR', message: r.stderr || 'Failed to write file', recoverable: true } as RuntimeError;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const r = await this.execute({ command: 'test', args: ['-e', this.resolvePath(filePath)] });
    return r.exitCode === 0;
  }

  async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const r = await this.execute({ command: 'ls', args: ['-la', this.resolvePath(dirPath)] });
    if (r.exitCode !== 0) return [];
    return parseLs(r.stdout, this.resolvePath(dirPath));
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.execute({ command: 'rm', args: ['-rf', this.resolvePath(filePath)] });
  }

  async createDirectory(dirPath: string): Promise<void> {
    await this.execute({ command: 'mkdir', args: ['-p', this.resolvePath(dirPath)] });
  }

  getWorkspaceRoot(): string { return this.workspace; }
  isInWorkspace(filePath: string): boolean { return filePath.startsWith(this.workspace); }
  resolvePath(...segments: string[]): string {
    if (segments.length === 0) return this.workspace;
    const joined = segments.join('/');
    return joined.startsWith('/') ? joined : `${this.workspace}/${joined}`;
  }
}
