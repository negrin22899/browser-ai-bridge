import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class ShellExecTool implements Tool {
  readonly name = 'shell.exec';
  readonly description = 'Execute a shell command (DANGEROUS - always requires permission)';
  readonly parameters = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
    },
    required: ['command'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = params.command as string;
    const timeout = (params.timeout as number) ?? 30000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout,
        env: { ...process.env, ...context.env },
      });

      return {
        success: true,
        output: stdout || stderr || 'Command completed',
      };
    } catch (error: unknown) {
      const err = error as { code?: number; stderr?: string; message?: string };
      return {
        success: false,
        output: '',
        error: `Exit code ${err.code ?? 'unknown'}: ${err.stderr ?? err.message}`,
      };
    }
  }
}
