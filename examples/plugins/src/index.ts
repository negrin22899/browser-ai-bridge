import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import type { Tool, ToolContext, ToolResult } from '@bab/protocol';

class EchoTool implements Tool {
  readonly name = 'example.echo';
  readonly description = 'Echo back the input (for testing)';
  readonly parameters = {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to echo' },
    },
    required: ['message'],
  };

  async execute(params: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    return {
      success: true,
      output: `Echo: ${params.message}`,
    };
  }
}

const plugin: Plugin = {
  name: 'example',
  version: '0.1.0',
  description: 'Example plugin demonstrating plugin SDK',

  async initialize(context: PluginContext): Promise<void> {
    context.registerTool(new EchoTool());
  },

  async shutdown(): Promise<void> {
    // Cleanup if needed
  },
};

export default plugin;
