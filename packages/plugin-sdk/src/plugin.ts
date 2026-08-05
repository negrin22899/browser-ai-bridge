import type { Tool, Provider } from '@bab/protocol';
import type { EventBus } from '@bab/core';

export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PluginContext {
  eventBus: EventBus;
  registerTool(tool: Tool): void;
  registerProvider(provider: Provider): void;
  getConfig<T>(key: string): T;
}
