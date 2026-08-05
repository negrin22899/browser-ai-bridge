import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class GitStatusTool implements Tool {
  readonly name = 'git.status';
  readonly description = 'Get git working tree status';
  readonly parameters = {
    type: 'object',
    properties: {},
  };

  async execute(_params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: context.workingDirectory,
      });
      return { success: true, output: stdout.trim() || 'Working tree clean' };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class GitDiffTool implements Tool {
  readonly name = 'git.diff';
  readonly description = 'Show git diff';
  readonly parameters = {
    type: 'object',
    properties: {
      staged: { type: 'boolean', description: 'Show staged changes' },
    },
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const args = ['diff'];
    if (params.staged) args.push('--staged');

    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: context.workingDirectory,
      });
      return { success: true, output: stdout || 'No changes' };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class GitCommitTool implements Tool {
  readonly name = 'git.commit';
  readonly description = 'Create a git commit';
  readonly parameters = {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Commit message' },
      add: { type: 'boolean', description: 'Stage all changes before commit' },
    },
    required: ['message'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      if (params.add) {
        await execFileAsync('git', ['add', '.'], { cwd: context.workingDirectory });
      }

      const { stdout } = await execFileAsync(
        'git',
        ['commit', '-m', params.message as string],
        { cwd: context.workingDirectory }
      );

      return { success: true, output: stdout.trim() };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
