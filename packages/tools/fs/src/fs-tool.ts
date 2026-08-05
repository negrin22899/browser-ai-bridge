import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, isAbsolute } from 'node:path';

export class FsReadTool implements Tool {
  readonly name = 'fs.read';
  readonly description = 'Read file contents or list directory';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File or directory path' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const path = params.path as string;
    // Use absolute path as-is, otherwise join with working directory
    const fullPath = isAbsolute(path) ? path : join(context.workingDirectory, path);

    try {
      const fileStat = await stat(fullPath);

      if (fileStat.isDirectory()) {
        const entries = await readdir(fullPath, { withFileTypes: true });
        const listing = entries.map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`);
        return { success: true, output: listing.join('\n') };
      }

      const content = await readFile(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class FsWriteTool implements Tool {
  readonly name = 'fs.write';
  readonly description = 'Write content to a file';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const path = params.path as string;
    const content = params.content as string;
    // Use absolute path as-is, otherwise join with working directory
    const fullPath = isAbsolute(path) ? path : join(context.workingDirectory, path);

    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      return { success: true, output: `Written ${content.length} bytes to ${path}` };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
