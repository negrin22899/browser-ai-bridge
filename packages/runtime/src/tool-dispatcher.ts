import type {
  Tool,
  ToolDescription,
  ToolResult,
  ToolContext,
  ToolDispatcher as IToolDispatcher,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';

const DEFAULT_TIMEOUT = 30_000;

export class ToolDispatcher implements IToolDispatcher {
  private tools = new Map<string, Tool>();
  private defaultTimeout: number;

  constructor(private eventBus: EventBus, timeout?: number) {
    this.defaultTimeout = timeout ?? DEFAULT_TIMEOUT;
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDescriptions(): ToolDescription[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool "${name}" not found` };
    }

    const timeout = context.scope.maxExecutionTime || this.defaultTimeout;

    this.eventBus.emit('tool.requested', { toolName: name, params, sessionId: context.sessionId });
    this.eventBus.emit('tool.executing', { toolName: name, sessionId: context.sessionId });

    try {
      const result = await this.executeWithTimeout(tool, params, context, timeout);

      this.eventBus.emit('tool.completed', { toolName: name, result, sessionId: context.sessionId });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.eventBus.emit('tool.error', { toolName: name, error: errorMsg, sessionId: context.sessionId });

      return { success: false, output: '', error: errorMsg };
    }
  }

  private executeWithTimeout(
    tool: Tool,
    params: Record<string, unknown>,
    context: ToolContext,
    timeout: number
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool "${tool.name}" timed out after ${timeout}ms`));
      }, timeout);

      tool.execute(params, context).then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}
