import { describe, it, expect } from 'vitest';
import { PluginValidator, validatePlugin, validateManifest } from '../validator.js';

describe('PluginValidator', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator();
  });

  describe('validateManifest', () => {
    it('should validate valid manifest', () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        provides: {
          providers: [{
            id: 'test',
            name: 'Test',
            type: 'api' as const,
          }],
        },
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail without name', () => {
      const manifest = {
        version: '1.0.0',
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should fail without version', () => {
      const manifest = {
        name: 'test-plugin',
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: version');
    });

    it('should warn about missing description', () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
      };

      const result = validator.validateManifest(manifest);

      expect(result.warnings).toContain('Missing description');
    });
  });

  describe('validatePlugin', () => {
    it('should validate valid plugin', () => {
      const plugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          provides: {},
        },
        initialize: async () => {},
        shutdown: async () => {},
      };

      const result = validator.validatePlugin(plugin);

      expect(result.valid).toBe(true);
    });

    it('should fail without initialize', () => {
      const plugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          provides: {},
        },
        shutdown: async () => {},
      };

      const result = validator.validatePlugin(plugin as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin missing initialize() method');
    });

    it('should fail without shutdown', () => {
      const plugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          provides: {},
        },
        initialize: async () => {},
      };

      const result = validator.validatePlugin(plugin as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin missing shutdown() method');
    });
  });
});

describe('validateManifest', () => {
  it('should validate manifest', () => {
    const result = validateManifest({
      name: 'test',
      version: '1.0.0',
    });

    expect(result.valid).toBe(true);
  });
});

describe('validatePlugin', () => {
  it('should validate plugin', () => {
    const result = validatePlugin({
      manifest: {
        name: 'test',
        version: '1.0.0',
        description: 'Test',
        provides: {},
      },
      initialize: async () => {},
      shutdown: async () => {},
    });

    expect(result.valid).toBe(true);
  });
});
