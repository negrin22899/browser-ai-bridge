# Tool SDK Guide

> Build a Tool plugin for Browser AI Bridge in minutes.

## Overview

A Tool gives AI providers the ability to interact with your local environment (files, git, shell, etc.).

```typescript
interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}
```

## Quick Start

### 1. Create Plugin Structure

```
plugins/tool-mytool/
├── package.json
├── tsconfig.json
└── src/
    ├── my-tool.ts
    └── index.ts
```

### 2. Implement Tool

```typescript
// src/my-tool.ts

import type { Tool, ToolContext, ToolResult } from '@bab/protocol';

export class MyTool implements Tool {
  readonly name = 'mytool.action';
  readonly description = 'Performs a custom action';
  readonly parameters = {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input for the action',
      },
    },
    required: ['input'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const input = params.input as string;

    try {
      // Your tool logic here
      const result = await doSomething(input, context.workingDirectory);

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### 3. Create Plugin Entry

```typescript
// src/index.ts

import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { MyTool } from './my-tool.js';

const mytoolPlugin: Plugin = {
  manifest: {
    name: 'tool-mytool',
    version: '1.0.0',
    description: 'Custom tool for Browser AI Bridge',
    provides: {
      tools: [{
        name: 'mytool.action',
        description: 'Performs a custom action',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        permissionMode: 'confirm',
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    context.registerTool(new MyTool());
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

export default mytoolPlugin;
```

## Permission Modes

Tools have different permission levels:

### Auto (read-only operations)
```typescript
// No confirmation needed
readonly name = 'fs.read';
```

### Confirm (write operations)
```typescript
// User must confirm before execution
readonly name = 'fs.write';
```

### Deny (dangerous operations)
```typescript
// Always blocked (e.g., sudo, format)
readonly name = 'shell.exec';
```

## Tool Context

The `ToolContext` provides session information:

```typescript
interface ToolContext {
  sessionId: string;
  workingDirectory: string;
  scope: ToolScope;
  env: Record<string, string>;
}

interface ToolScope {
  allowedPaths: string[];
  allowedCommands: string[];
  deniedCommands: string[];
  maxExecutionTime: number;
}
```

Use context to:
- Resolve relative paths
- Check permissions
- Access environment variables

## Examples

### File System Tool

```typescript
export class ReadFileTool implements Tool {
  readonly name = 'fs.read';
  readonly description = 'Read file contents';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const path = params.path as string;
    const fullPath = join(context.workingDirectory, path);

    try {
      const content = await readFile(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (error) {
      return { success: false, output: '', error: error.message };
    }
  }
}
```

### Git Tool

```typescript
export class GitStatusTool implements Tool {
  readonly name = 'git.status';
  readonly description = 'Get git status';
  readonly parameters = { type: 'object', properties: {} };

  async execute(_params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: context.workingDirectory,
      });
      return { success: true, output: stdout.trim() || 'Working tree clean' };
    } catch (error) {
      return { success: false, output: '', error: error.message };
    }
  }
}
```

### Shell Tool

```typescript
export class ShellExecTool implements Tool {
  readonly name = 'shell.exec';
  readonly description = 'Execute shell command';
  readonly parameters = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
    },
    required: ['command'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const command = params.command as string;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout: context.scope.maxExecutionTime,
      });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      return { success: false, output: '', error: error.message };
    }
  }
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyTool } from './my-tool.js';

describe('MyTool', () => {
  it('should execute successfully', async () => {
    const tool = new MyTool();
    const context = {
      sessionId: 'test',
      workingDirectory: '/tmp',
      scope: {
        allowedPaths: ['/tmp'],
        allowedCommands: [],
        deniedCommands: [],
        maxExecutionTime: 30000,
      },
      env: {},
    };

    const result = await tool.execute({ input: 'test' }, context);
    expect(result.success).toBe(true);
  });
});
```

## Best Practices

1. **Clear names**: Use `category.action` format (e.g., `fs.read`, `git.commit`)
2. **Good descriptions**: AI uses descriptions to decide which tool to call
3. **Proper parameters**: Use JSON Schema for parameters
4. **Error handling**: Always return `ToolResult`, never throw
5. **Timeout respect**: Use `context.scope.maxExecutionTime`
6. **Path resolution**: Always join with `context.workingDirectory`
