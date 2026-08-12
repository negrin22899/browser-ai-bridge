/**
 * Runtime Provider — Execution Environment Abstraction
 * 
 * AI Provider ≠ Runtime Provider
 * 
 * Gemini/ChatGPT/Claude = AI Provider
 * Local/Docker/WSL/SSH = Runtime Provider
 * 
 * Tool → Permission Engine → Runtime Provider → Execution
 */

// ============================================================================
// RUNTIME PROVIDER INTERFACE
// ============================================================================

/**
 * RuntimeProvider - stable contract for execution environments
 * 
 * All runtime providers implement this interface.
 * Adding a new Runtime Provider does NOT require changing Tools or Providers.
 */
export interface RuntimeProvider {
  /** Runtime metadata */
  readonly metadata: RuntimeProviderMetadata;

  /** Runtime state */
  readonly state: RuntimeState;

  /** Runtime capabilities */
  readonly capabilities: RuntimeCapabilities;

  // --- Lifecycle ---

  /** Connect to runtime */
  connect(options?: RuntimeConnectOptions): Promise<void>;

  /** Disconnect from runtime */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  // --- Health ---

  /** Check runtime health */
  health(): Promise<RuntimeHealthResult>;

  // --- Execution ---

  /** Execute a command */
  execute(command: RuntimeCommand): Promise<RuntimeExecutionResult>;

  /** Cancel execution */
  cancel(executionId: string): Promise<void>;

  // --- Filesystem ---

  /** Read file */
  readFile(path: string): Promise<string>;

  /** Write file */
  writeFile(path: string, content: string): Promise<void>;

  /** Check if file exists */
  fileExists(path: string): Promise<boolean>;

  /** List directory */
  listDirectory(path: string): Promise<DirectoryEntry[]>;

  /** Delete file */
  deleteFile(path: string): Promise<void>;

  /** Create directory */
  createDirectory(path: string): Promise<void>;

  // --- Workspace ---

  /** Get workspace root */
  getWorkspaceRoot(): string;

  /** Check if path is in workspace */
  isInWorkspace(path: string): boolean;

  /** Resolve path relative to workspace */
  resolvePath(...segments: string[]): string;
}

// ============================================================================
// RUNTIME METADATA
// ============================================================================

export interface RuntimeProviderMetadata {
  /** Runtime ID */
  readonly id: string;

  /** Runtime name */
  readonly name: string;

  /** Runtime version */
  readonly version: string;

  /** Runtime type */
  readonly type: RuntimeType;

  /** Description */
  readonly description?: string;
}

export type RuntimeType = 'local' | 'docker' | 'wsl' | 'ssh' | 'remote';

// ============================================================================
// RUNTIME STATE
// ============================================================================

export type RuntimeConnectionState =
  | 'discovered'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'degraded'
  | 'recovering'
  | 'disconnected'
  | 'destroyed';

export interface RuntimeState {
  /** Connection state */
  state: RuntimeConnectionState;

  /** State timestamp */
  timestamp: number;

  /** Error if in error state */
  error?: RuntimeError;
}

// ============================================================================
// RUNTIME CAPABILITIES
// ============================================================================

export interface RuntimeCapabilities {
  /** Can read files */
  filesystemRead: boolean;

  /** Can write files */
  filesystemWrite: boolean;

  /** Can execute processes */
  processExecute: boolean;

  /** Can access network */
  network: boolean;

  /** Can use git */
  git: boolean;

  /** Can run shell commands */
  shell: boolean;

  /** Supported platforms */
  platforms?: string[];

  /** Max concurrent executions */
  maxConcurrent?: number;

  /** Max execution time in ms */
  maxExecutionTime?: number;

  /** Custom capabilities */
  custom?: Record<string, boolean | string | number>;
}

// ============================================================================
// RUNTIME COMMAND
// ============================================================================

export interface RuntimeCommand {
  /** Command to execute */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in ms */
  timeout?: number;

  /** Execution ID (auto-generated if not provided) */
  executionId?: string;

  /** Session ID for isolation */
  sessionId?: string;
}

// ============================================================================
// RUNTIME EXECUTION RESULT
// ============================================================================

export interface RuntimeExecutionResult {
  /** Execution ID */
  executionId: string;

  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;

  /** Execution duration in ms */
  duration: number;

  /** Was cancelled */
  cancelled: boolean;

  /** Error if failed */
  error?: RuntimeError;
}

// ============================================================================
// DIRECTORY ENTRY
// ============================================================================

export interface DirectoryEntry {
  /** Entry name */
  name: string;

  /** Full path */
  path: string;

  /** Is directory */
  isDirectory: boolean;

  /** Is file */
  isFile: boolean;

  /** File size in bytes */
  size?: number;

  /** Last modified timestamp */
  modifiedAt?: number;
}

// ============================================================================
// RUNTIME ERROR
// ============================================================================

export type RuntimeErrorCode =
  | 'RUNTIME_UNAVAILABLE'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_TIMEOUT'
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'PERMISSION_DENIED'
  | 'WORKSPACE_VIOLATION'
  | 'NETWORK_ERROR'
  | 'PROCESS_ERROR'
  | 'UNKNOWN';

export interface RuntimeError {
  code: RuntimeErrorCode;
  message: string;
  recoverable: boolean;
  recovery?: string;
  original?: unknown;
}

// ============================================================================
// RUNTIME HEALTH
// ============================================================================

export interface RuntimeHealthResult {
  /** Is healthy */
  healthy: boolean;

  /** Connection state */
  state: RuntimeConnectionState;

  /** Latency in ms */
  latency?: number;

  /** Error if unhealthy */
  error?: RuntimeError;

  /** Workspace accessible */
  workspaceAccessible?: boolean;

  /** Disk space info */
  diskSpace?: {
    total: number;
    used: number;
    available: number;
  };
}

// ============================================================================
// RUNTIME CONNECT OPTIONS
// ============================================================================

export interface RuntimeConnectOptions {
  /** Workspace root path */
  workspace?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Docker-specific options */
  docker?: DockerOptions;

  /** SSH-specific options */
  ssh?: SSHOptions;

  /** WSL-specific options */
  wsl?: WSLOptions;

  /** Custom options */
  custom?: Record<string, unknown>;
}

export interface DockerOptions {
  /** Container image */
  image?: string;

  /** Container name */
  containerName?: string;

  /** Mount volumes */
  volumes?: Array<{ host: string; container: string }>;

  /** Network mode */
  network?: string;

  /** Auto-remove container */
  autoRemove?: boolean;
}

export interface SSHOptions {
  /** Host */
  host: string;

  /** Port */
  port?: number;

  /** Username */
  username: string;

  /** Private key path */
  privateKeyPath?: string;

  /** Password (not recommended) */
  password?: string;
}

export interface WSLOptions {
  /** WSL distribution name */
  distribution?: string;

  /** User */
  user?: string;
}
