import type { Tool, ToolContext, ToolResult } from '@bab/protocol';
import { readFile, readdir, writeFile, stat, rm, mkdir } from 'node:fs/promises';
import { join, dirname, isAbsolute, resolve, relative, sep } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.cache']);

function resolvePath(context: ToolContext, raw: string): string {
  return isAbsolute(raw) ? raw : join(context.workingDirectory, raw);
}

async function walk(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...(await walk(join(dir, entry.name))));
    } else if (entry.isFile()) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

function globToRegExp(pattern: string): RegExp {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*';
        i += 2;
        if (pattern[i] === '/') i++;
      } else {
        re += '[^/]*';
        i++;
      }
    } else if (ch === '?') {
      re += '[^/]';
      i++;
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }
  return new RegExp(`^${re}$`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRelPath(root: string, file: string): string {
  return relative(root, file).split(sep).join('/');
}

// ── fs.exists ──────────────────────────────────────────────────

export class FsExistsTool implements Tool {
  readonly name = 'fs.exists';
  readonly description = 'Check whether a file or directory exists';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File or directory path' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const fullPath = resolvePath(context, params.path as string);
    try {
      const s = await stat(fullPath);
      return {
        success: true,
        output: JSON.stringify({ exists: true, type: s.isDirectory() ? 'directory' : 'file' }),
      };
    } catch {
      return { success: true, output: JSON.stringify({ exists: false, type: null }) };
    }
  }
}

// ── fs.glob ────────────────────────────────────────────────────

export class FsGlobTool implements Tool {
  readonly name = 'fs.glob';
  readonly description = 'Find files matching a glob pattern (e.g. "src/**/*.ts")';
  readonly parameters = {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern relative to cwd' },
      cwd: { type: 'string', description: 'Directory to search from (default: working directory)' },
    },
    required: ['pattern'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = (params.pattern as string).split('\\').join('/');
    const root = resolve(context.workingDirectory, (params.cwd as string) ?? '.');
    const regex = globToRegExp(pattern);

    const files = await walk(root);
    const matches = files
      .map((f) => toRelPath(root, f))
      .filter((p) => regex.test(p))
      .sort();

    return { success: true, output: JSON.stringify(matches, null, 2) };
  }
}

// ── fs.search ──────────────────────────────────────────────────

export class FsSearchTool implements Tool {
  readonly name = 'fs.search';
  readonly description = 'Search file contents for a text or regex pattern';
  readonly parameters = {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Text or regex to search for' },
      path: { type: 'string', description: 'Directory to search (default: working directory)' },
      filePattern: { type: 'string', description: 'Optional glob to filter files (e.g. **/*.ts)' },
      caseSensitive: { type: 'boolean', description: 'Case-sensitive search (default: true)' },
      maxResults: { type: 'number', description: 'Maximum matches to return (default: 100)' },
    },
    required: ['pattern'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const rawPattern = params.pattern as string;
    const caseSensitive = params.caseSensitive !== false;
    const maxResults = (params.maxResults as number) ?? 100;
    const root = resolve(context.workingDirectory, (params.path as string) ?? '.');

    let regex: RegExp;
    try {
      regex = new RegExp(rawPattern, caseSensitive ? '' : 'i');
    } catch {
      regex = new RegExp(escapeRegExp(rawPattern), caseSensitive ? '' : 'i');
    }

    const fileGlob = params.filePattern ? globToRegExp((params.filePattern as string).split('\\').join('/')) : null;
    const files = await walk(root);
    const matches: Array<{ file: string; line: number; column: number; text: string }> = [];

    for (const file of files) {
      if (fileGlob && !fileGlob.test(toRelPath(root, file))) continue;
      if (matches.length >= maxResults) break;

      let content: string;
      try {
        content = await readFile(file, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        regex.lastIndex = 0;
        const m = regex.exec(line);
        if (m) {
          matches.push({
            file: toRelPath(root, file),
            line: i + 1,
            column: m.index + 1,
            text: line.trim(),
          });
          if (matches.length >= maxResults) break;
        }
      }
    }

    return { success: true, output: JSON.stringify(matches, null, 2) };
  }
}

// ── fs.edit ────────────────────────────────────────────────────

interface Hunk {
  oldStart: number;
  newStart: number;
  lines: string[];
}

function parseHunks(patch: string): Hunk[] {
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;

  for (const line of patch.split('\n')) {
    const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (m) {
      current = { oldStart: parseInt(m[1], 10), newStart: parseInt(m[2], 10), lines: [] };
      hunks.push(current);
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
  }
  return hunks;
}

function applyPatch(original: string, patch: string): string {
  const hunks = parseHunks(patch);
  if (hunks.length === 0) {
    throw new Error('No hunks found in patch');
  }

  const result = original.split('\n');
  // Apply from bottom to top so earlier line numbers stay valid.
  const ordered = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of ordered) {
    const expectedOld: string[] = [];
    const newSegment: string[] = [];

    for (const line of hunk.lines) {
      if (line === '\\ No newline at end of file') continue;
      if (line.startsWith(' ')) {
        expectedOld.push(line.slice(1));
        newSegment.push(line.slice(1));
      } else if (line.startsWith('-')) {
        expectedOld.push(line.slice(1));
      } else if (line.startsWith('+')) {
        newSegment.push(line.slice(1));
      }
    }

    const start = hunk.oldStart - 1;
    const actualOld = result.slice(start, start + expectedOld.length);
    if (JSON.stringify(actualOld) !== JSON.stringify(expectedOld)) {
      throw new Error(`Patch does not match file content at line ${hunk.oldStart}`);
    }

    result.splice(start, expectedOld.length, ...newSegment);
  }

  return result.join('\n');
}

export class FsEditTool implements Tool {
  readonly name = 'fs.edit';
  readonly description = 'Edit a file via exact search/replace or a unified diff patch';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      search: { type: 'string', description: 'Exact text to replace (must be unique)' },
      replace: { type: 'string', description: 'Replacement text' },
      patch: { type: 'string', description: 'Unified diff patch to apply' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const fullPath = resolvePath(context, params.path as string);

    try {
      const original = await readFile(fullPath, 'utf-8');

      let next: string;
      if (typeof params.patch === 'string' && params.patch.trim() !== '') {
        next = applyPatch(original, params.patch);
      } else if (typeof params.search === 'string') {
        const search = params.search;
        const replace = (params.replace as string) ?? '';
        const count = original.split(search).length - 1;
        if (count === 0) {
          return { success: false, output: '', error: 'Search text not found in file' };
        }
        if (count > 1) {
          return {
            success: false,
            output: '',
            error: `Search text found ${count} times — provide more context to make it unique`,
          };
        }
        next = original.replace(search, replace);
      } else {
        return {
          success: false,
          output: '',
          error: 'Provide either "search"/"replace" or a unified "patch"',
        };
      }

      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, next, 'utf-8');
      return { success: true, output: `Edited ${params.path}` };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ── fs.delete ──────────────────────────────────────────────────

export class FsDeleteTool implements Tool {
  readonly name = 'fs.delete';
  readonly description = 'Delete a file or directory';
  readonly parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File or directory path' },
      recursive: { type: 'boolean', description: 'Delete directories recursively (default: false)' },
    },
    required: ['path'],
  };

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const fullPath = resolvePath(context, params.path as string);
    const recursive = params.recursive === true;

    try {
      await rm(fullPath, { recursive, force: false });
      return { success: true, output: `Deleted ${params.path}` };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
