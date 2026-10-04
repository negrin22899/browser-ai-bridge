import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ToolContext } from '@bab/protocol';
import {
  FsEditTool,
  FsSearchTool,
  FsGlobTool,
  FsExistsTool,
  FsDeleteTool,
} from './fs-edit-tools.js';

let dir = '';
const context: ToolContext = {
  sessionId: 'test',
  workingDirectory: '',
  scope: {
    allowedPaths: [],
    allowedCommands: [],
    deniedCommands: [],
    maxExecutionTime: 30000,
  },
  env: {},
};

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bab-fs-'));
  context.workingDirectory = dir;

  await writeFile(join(dir, 'a.txt'), 'hello world\nhello again\n');
  await writeFile(join(dir, 'b.ts'), 'const x = 1;\nexport const y = 2;\n');
  await mkdir(join(dir, 'sub'));
  await writeFile(join(dir, 'sub', 'c.ts'), 'const z = 3;\n');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('FsExistsTool', () => {
  const tool = new FsExistsTool();

  it('reports an existing file', async () => {
    const result = await tool.execute({ path: 'a.txt' }, context);
    expect(result.success).toBe(true);
    expect(JSON.parse(result.output)).toEqual({ exists: true, type: 'file' });
  });

  it('reports a missing file', async () => {
    const result = await tool.execute({ path: 'missing.txt' }, context);
    expect(JSON.parse(result.output)).toEqual({ exists: false, type: null });
  });
});

describe('FsGlobTool', () => {
  const tool = new FsGlobTool();

  it('finds files matching a recursive glob', async () => {
    const result = await tool.execute({ pattern: '**/*.ts' }, context);
    expect(JSON.parse(result.output)).toEqual(['b.ts', 'sub/c.ts']);
  });

  it('finds files matching a single-level glob', async () => {
    const result = await tool.execute({ pattern: '*.txt' }, context);
    expect(JSON.parse(result.output)).toEqual(['a.txt']);
  });
});

describe('FsSearchTool', () => {
  const tool = new FsSearchTool();

  it('finds a text pattern across files', async () => {
    const result = await tool.execute({ pattern: 'export', filePattern: '**/*.ts' }, context);
    const matches = JSON.parse(result.output);
    expect(matches).toHaveLength(1);
    expect(matches[0].file).toBe('b.ts');
    expect(matches[0].line).toBe(2);
  });

  it('supports regex patterns', async () => {
    const result = await tool.execute({ pattern: 'const [xyz]', filePattern: '**/*.ts' }, context);
    const matches = JSON.parse(result.output);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FsEditTool', () => {
  const tool = new FsEditTool();

  it('replaces a unique search string', async () => {
    const target = 'edit-unique.txt';
    await writeFile(join(dir, target), 'before after before\n');

    const result = await tool.execute(
      { path: target, search: 'after', replace: 'between' },
      context
    );
    expect(result.success).toBe(true);

    const content = await readFile(join(dir, target), 'utf-8');
    expect(content).toBe('before between before\n');
  });

  it('fails when the search string is not unique', async () => {
    const target = 'edit-multi.txt';
    await writeFile(join(dir, target), 'dup dup dup\n');

    const result = await tool.execute({ path: target, search: 'dup', replace: 'x' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('3 times');
  });

  it('fails when the search string is missing', async () => {
    const target = 'edit-missing.txt';
    await writeFile(join(dir, target), 'content\n');

    const result = await tool.execute({ path: target, search: 'nope', replace: 'x' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('applies a unified diff patch', async () => {
    const target = 'edit-patch.ts';
    await writeFile(join(dir, target), 'const x = 1;\nexport const y = 2;\n');

    const patch = [
      '@@ -1,2 +1,2 @@',
      '-const x = 1;',
      '-export const y = 2;',
      '+const x = 10;',
      '+export const y = 20;',
      '',
    ].join('\n');

    const result = await tool.execute({ path: target, patch }, context);
    expect(result.success).toBe(true);

    const content = await readFile(join(dir, target), 'utf-8');
    expect(content).toBe('const x = 10;\nexport const y = 20;\n');
  });
});

describe('FsDeleteTool', () => {
  const tool = new FsDeleteTool();

  it('deletes a file', async () => {
    const target = 'delete-me.txt';
    await writeFile(join(dir, target), 'bye\n');

    const result = await tool.execute({ path: target }, context);
    expect(result.success).toBe(true);

    await expect(readFile(join(dir, target), 'utf-8')).rejects.toThrow();
  });
});
