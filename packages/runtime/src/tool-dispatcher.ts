import type {
  Tool,
  ToolDescription,
  ToolResult,
  ToolContext,
  ToolDispatcher as IToolDispatcher,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';

export class ToolDispatcher implements IToolDispatcher {
  private tools = new Map<string, Tool>();

  constructor(private eventBus: EventBus) {}

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
      throw new Error(`Tool "${name}" not found`);
    }

    this.eventBus.emit('tool.requested', {
      toolName: name,
      params,
      sessionId: context.sessionId,
    });

    this.eventBus.emit('tool.executing', {
      toolName: name,
      sessionId: context.sessionId,
    });

    try {
      const result = await tool.execute(params, context);

      this.eventBus.emit('tool.completed', {
        toolName: name,
        result,
        sessionId: context.sessionId,
      });

      return result;
    } catch (error) {
      this.eventBus.emit('tool.error', {
        toolName: name,
        error: error instanceof Error ? error.message : String(error),
        sessionId: context.sessionId,
      });
      throw error;
    }
  }
}
