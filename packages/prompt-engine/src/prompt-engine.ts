import type { ToolDescription, ToolNegotiation, NegotiationConstraints } from '@bab/protocol';

export type IdeTarget = 'cursor' | 'vscode' | 'continue' | 'generic';

const IDE_SECTIONS: Record<Exclude<IdeTarget, 'generic'>, string> = {
  cursor: `## Environment: Cursor IDE
You are running inside Cursor. Respect the project's .cursorrules if present.
Prefer editing existing files with minimal diffs, read before you edit, and
format output so it reads naturally in Cursor's chat and agent panels.`,
  vscode: `## Environment: VS Code
You are running inside Visual Studio Code. Use the workspace folder as your
context, reference files by relative path, and match the repository's existing
code style and formatting settings.`,
  continue: `## Environment: Continue
You are running inside Continue. Keep answers concise and actionable, prefer
returning concrete code edits or diffs over long explanations, and write code
that fits the current editor context.`,
};

/**
 * Detect the calling IDE from a client hint (user-agent / custom header).
 */
export function detectIde(hint: string | undefined | null): IdeTarget {
  const h = (hint ?? '').toLowerCase();
  if (h.includes('cursor')) return 'cursor';
  if (h.includes('continue')) return 'continue';
  if (h.includes('vscode') || h.includes('visual studio code') || h.includes('code/1.')) return 'vscode';
  return 'generic';
}

export class PromptEngine {
  generateSystemPrompt(
    tools: ToolDescription[],
    constraints?: NegotiationConstraints,
    ide: IdeTarget = 'generic'
  ): string {
    const sections: string[] = [];

    sections.push(this.buildHeader());
    sections.push(this.buildFormatSection());

    if (tools.length > 0) {
      sections.push(this.buildToolsSection(tools));
    }

    if (constraints) {
      sections.push(this.buildConstraintsSection(constraints));
    }

    if (ide !== 'generic') {
      sections.push(IDE_SECTIONS[ide]);
    }

    sections.push(this.buildExamplesSection(tools));

    return sections.join('\n\n');
  }

  generateNegotiation(tools: ToolDescription[], constraints: NegotiationConstraints): ToolNegotiation {
    return {
      availableTools: tools,
      constraints,
      format: 'actions',
    };
  }

  private buildHeader(): string {
    return `You are an AI assistant with access to local developer tools.
You can execute tools by responding with a JSON object containing an "actions" array.
Each action specifies a tool to call with its parameters.
IMPORTANT: Always use the exact format shown below. Do NOT use function calling or any other format.`;
  }

  private buildFormatSection(): string {
    return `## Response Format

When you need to use tools, respond with ONLY a JSON object (no markdown, no explanation):

\`\`\`json
{
  "actions": [
    {
      "id": "unique-action-id",
      "tool": "tool.name",
      "params": { "key": "value" },
      "description": "Brief description of what this action does"
    }
  ]
}
\`\`\`

After receiving tool results, you will get a response with:
\`\`\`json
{
  "results": [
    {
      "id": "action-id",
      "success": true,
      "output": "tool output"
    }
  ],
  "summary": "Brief summary of what was done"
}
\`\`\`

You can then respond normally with the results.`;
  }

  private buildToolsSection(tools: ToolDescription[]): string {
    const toolDocs = tools.map((tool) => this.formatToolDoc(tool)).join('\n\n');

    return `## Available Tools

${toolDocs}`;
  }

  private formatToolDoc(tool: ToolDescription): string {
    const params = Object.entries(tool.parameters.properties ?? {})
      .map(([key, schema]) => `  - ${key}: ${(schema as { type: string }).type}`)
      .join('\n');

    return `### ${tool.name}
${tool.description}
Parameters:
${params || '  (none)'}`;
  }

  private buildConstraintsSection(constraints: NegotiationConstraints): string {
    const lines: string[] = ['## Constraints'];

    if (constraints.maxActionsPerTurn) {
      lines.push(`- Maximum ${constraints.maxActionsPerTurn} actions per response`);
    }
    if (constraints.allowedTools.length > 0) {
      lines.push(`- Allowed tools: ${constraints.allowedTools.join(', ')}`);
    }
    if (constraints.deniedTools.length > 0) {
      lines.push(`- Denied tools: ${constraints.deniedTools.join(', ')}`);
    }
    if (constraints.requireConfirmation.length > 0) {
      lines.push(`- These tools require user confirmation: ${constraints.requireConfirmation.join(', ')}`);
    }

    return lines.join('\n');
  }

  private buildExamplesSection(tools: ToolDescription[]): string {
    if (tools.length === 0) return '';

    const exampleTool = tools[0];
    const firstParam = Object.keys(exampleTool.parameters.properties ?? {})[0] ?? 'value';

    return `## Example

User: "Read the file config.json"

Your response:
\`\`\`json
{
  "actions": [
    {
      "id": "read-1",
      "tool": "${exampleTool.name}",
      "params": { "${firstParam}": "config.json" },
      "description": "Reading config.json file"
    }
  ]
}
\`\`\``;
  }
}
