import { describe, it, expect } from 'vitest';
import { PromptEngine, detectIde } from './prompt-engine.js';
import type { ToolDescription } from '@bab/protocol';

const mockTools: ToolDescription[] = [
  {
    name: 'fs.read',
    description: 'Read file contents',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'git.status',
    description: 'Get git status',
    parameters: { type: 'object', properties: {} },
  },
];

describe('detectIde', () => {
  it('detects Cursor from user-agent', () => {
    expect(detectIde('Mozilla/5.0 Cursor/0.42')).toBe('cursor');
  });

  it('detects VS Code from user-agent', () => {
    expect(detectIde('vscode/1.90.0')).toBe('vscode');
    expect(detectIde('Code/1.90.0')).toBe('vscode');
  });

  it('detects Continue', () => {
    expect(detectIde('continue/1.0')).toBe('continue');
  });

  it('detects OpenCode', () => {
    expect(detectIde('opencode/1.0')).toBe('opencode');
  });

  it('falls back to generic for unknown clients', () => {
    expect(detectIde('curl/8.0')).toBe('generic');
    expect(detectIde(undefined)).toBe('generic');
  });
});

describe('PromptEngine', () => {
  it('should generate system prompt with tool descriptions', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    expect(prompt).toContain('fs.read');
    expect(prompt).toContain('git.status');
    expect(prompt).toContain('actions');
  });

  it('should include Tool Negotiation format in prompt', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    expect(prompt).toContain('"actions"');
    expect(prompt).toContain('"tool"');
    expect(prompt).toContain('"params"');
  });

  it('should include tool parameters schema', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt(mockTools);

    expect(prompt).toContain('"path"');
  });

  it('should generate prompt for single tool', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt([mockTools[0]]);

    expect(prompt).toContain('fs.read');
    expect(prompt).not.toContain('git.status');
  });

  it('should handle empty tools list', () => {
    const engine = new PromptEngine();
    const prompt = engine.generateSystemPrompt([]);

    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('should tailor the prompt to the calling IDE', () => {
    const engine = new PromptEngine();
    expect(engine.generateSystemPrompt(mockTools, undefined, 'cursor')).toContain('Cursor IDE');
    expect(engine.generateSystemPrompt(mockTools, undefined, 'vscode')).toContain('VS Code');
    expect(engine.generateSystemPrompt(mockTools, undefined, 'continue')).toContain('Continue');
    expect(engine.generateSystemPrompt(mockTools, undefined, 'opencode')).toContain('OpenCode');
    expect(engine.generateSystemPrompt(mockTools, undefined, 'generic')).not.toContain('Environment:');
  });

  it('should generate negotiation object', () => {
    const engine = new PromptEngine();
    const negotiation = engine.generateNegotiation(mockTools, {
      maxActionsPerTurn: 5,
      allowedTools: ['fs.read', 'git.status'],
      deniedTools: [],
      requireConfirmation: ['shell.exec'],
    });

    expect(negotiation.format).toBe('actions');
    expect(negotiation.availableTools).toHaveLength(2);
    expect(negotiation.constraints.maxActionsPerTurn).toBe(5);
  });
});
