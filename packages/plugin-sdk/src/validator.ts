import type { Plugin, PluginManifest } from './types.js';

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Plugin Validator - validates plugin structure and implementation
 */
export class PluginValidator {
  /**
   * Validate a plugin manifest
   */
  validateManifest(manifest: Partial<PluginManifest>): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.name) {
      errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      errors.push('Plugin name must be lowercase with hyphens only');
    }

    if (!manifest.version) {
      errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push('Version should follow semver format (x.y.z)');
    }

    if (!manifest.description) {
      warnings.push('Missing description');
    }

    // Provides section
    if (!manifest.provides) {
      warnings.push('No provides section - plugin does not export anything');
    } else {
      if (manifest.provides.providers) {
        for (const provider of manifest.provides.providers) {
          if (!provider.id) {
            errors.push('Provider missing required field: id');
          }
          if (!provider.name) {
            errors.push(`Provider "${provider.id}" missing required field: name`);
          }
          if (!provider.type) {
            errors.push(`Provider "${provider.id}" missing required field: type`);
          } else if (!['browser', 'api', 'local'].includes(provider.type)) {
            errors.push(`Provider "${provider.id}" has invalid type: ${provider.type}`);
          }
        }
      }

      if (manifest.provides.tools) {
        for (const tool of manifest.provides.tools) {
          if (!tool.name) {
            errors.push('Tool missing required field: name');
          }
          if (!tool.description) {
            warnings.push(`Tool "${tool.name}" missing description`);
          }
          if (!tool.parameters) {
            warnings.push(`Tool "${tool.name}" missing parameters schema`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a plugin instance
   */
  validatePlugin(plugin: Plugin): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check manifest
    if (!plugin.manifest) {
      errors.push('Plugin missing manifest');
    } else {
      const manifestResult = this.validateManifest(plugin.manifest);
      errors.push(...manifestResult.errors);
      warnings.push(...manifestResult.warnings);
    }

    // Check required methods
    if (typeof plugin.initialize !== 'function') {
      errors.push('Plugin missing initialize() method');
    }

    if (typeof plugin.shutdown !== 'function') {
      errors.push('Plugin missing shutdown() method');
    }

    if (plugin.health && typeof plugin.health !== 'function') {
      errors.push('Plugin health must be a function');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Print validation report
   */
  printReport(result: PluginValidationResult, pluginName?: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(`Plugin Validation${pluginName ? `: ${pluginName}` : ''}`);
    console.log('='.repeat(60));
    console.log(`Status: ${result.valid ? '✅ PASS' : '❌ FAIL'}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of result.errors) {
        console.log(`  ❌ ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of result.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
    }

    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Quick validation function
 */
export function validatePlugin(plugin: Plugin): PluginValidationResult {
  const validator = new PluginValidator();
  return validator.validatePlugin(plugin);
}

/**
 * Quick manifest validation function
 */
export function validateManifest(manifest: Partial<PluginManifest>): PluginValidationResult {
  const validator = new PluginValidator();
  return validator.validateManifest(manifest);
}
