import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PluginMarketplace, type CatalogEntry } from './marketplace.js';

describe('PluginMarketplace', () => {
  let tmp: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bab-market-'));
    sourceDir = path.join(tmp, 'source', 'my-plugin');
    targetDir = path.join(tmp, 'installed');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'package.json'),
      JSON.stringify({ name: 'my-plugin', version: '1.0.0', bab: { provides: { tools: [] } } })
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('lists catalog entries', () => {
    const catalog: CatalogEntry[] = [{
      id: 'p1', name: 'p1', version: '1.0.0', description: 'test', source: '/x', sourceType: 'local',
    }];
    const marketplace = new PluginMarketplace({ targetDir, catalog });
    expect(marketplace.available()).toHaveLength(1);
    expect(marketplace.find('p1')?.description).toBe('test');
  });

  it('installs a local plugin by copying its directory', async () => {
    const catalog: CatalogEntry[] = [{
      id: 'my-plugin', name: 'my-plugin', version: '1.0.0', description: 'test', source: sourceDir, sourceType: 'local',
    }];
    const marketplace = new PluginMarketplace({ targetDir, catalog });

    const result = await marketplace.install('my-plugin');
    expect(result.installedTo).toBe(path.join(targetDir, 'my-plugin'));
    expect(fs.existsSync(path.join(result.installedTo, 'package.json'))).toBe(true);
  });

  it('refuses to overwrite an already-installed plugin', async () => {
    const catalog: CatalogEntry[] = [{
      id: 'my-plugin', name: 'my-plugin', version: '1.0.0', description: 'test', source: sourceDir, sourceType: 'local',
    }];
    const marketplace = new PluginMarketplace({ targetDir, catalog });
    await marketplace.install('my-plugin');

    await expect(marketplace.install('my-plugin')).rejects.toThrow('already installed');
  });

  it('rejects a missing local source', async () => {
    const marketplace = new PluginMarketplace({ targetDir });
    await expect(marketplace.install('/does/not/exist')).rejects.toThrow('not found');
  });
});
