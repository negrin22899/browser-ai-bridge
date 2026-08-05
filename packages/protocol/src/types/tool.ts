export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;

  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
  sessionId: string;
  workingDirectory: string;
  scope: ToolScope;
  env: Record<string, string>;
}

export interface ToolScope {
  allowedPaths: string[];
  allowedCommands: string[];
  deniedCommands: string[];
  maxExecutionTime: number;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDispatcher {
  register(tool: Tool): void;
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  getDescriptions(): ToolDescription[];
}

export interface ToolDescription {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
