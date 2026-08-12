import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Path Traversal Protection
 * 
 * "Jailbreak & Path Traversal Protection"
 * 
 * Within LocalRuntime, strictly enforce workspace boundaries:
 * 
 * Workspace = /users/project/sandbox/
 * 
 * AI calls readFile("../../../etc/passwd")
 * 
 * Expected result:
 * Runtime Provider → Path Normalization → Out of bounds → DENIED_BY_RUNTIME
 * 
 * This MUST happen even BEFORE Permission Engine check.
 */

// ============================================================================
// PATH SECURITY
// ============================================================================

export interface PathSecurityConfig {
  /** Allowed workspace roots */
  allowedRoots: string[];
  
  /** Denied paths (absolute) */
  deniedPaths?: string[];
  
  /** Allow symlinks inside workspace */
  allowSymlinks?: boolean;
}

export interface PathValidationResult {
  /** Is path valid */
  valid: boolean;
  
  /** Normalized path */
  normalizedPath: string;
  
  /** Error message if invalid */
  error?: string;
  
  /** Error code */
  errorCode?: PathErrorCode;
}

export type PathErrorCode =
  | 'PATH_TRAVERSAL'
  | 'OUTSIDE_WORKSPACE'
  | 'SYMLINK_ESCAPE'
  | 'DENIED_PATH'
  | 'INVALID_PATH';

/**
 * Path Security - enforces workspace boundaries
 */
export class PathSecurity {
  private config: PathSecurityConfig;

  constructor(config: PathSecurityConfig) {
    this.config = config;
  }

  /**
   * Validate and normalize a path
   * Returns normalized path or error
   */
  validate(filePath: string): PathValidationResult {
    // 1. Basic validation
    if (!filePath || filePath.trim() === '') {
      return {
        valid: false,
        normalizedPath: '',
        error: 'Empty path',
        errorCode: 'INVALID_PATH',
      };
    }

    // 2. Normalize the path (resolve .. and .)
    const normalized = this.normalizePath(filePath);

    // 3. Check for path traversal attempts
    if (this.hasTraversalAttempt(filePath)) {
      return {
        valid: false,
        normalizedPath: normalized,
        error: `Path traversal detected: ${filePath}`,
        errorCode: 'PATH_TRAVERSAL',
      };
    }

    // 4. Check if path is within allowed workspace
    const withinWorkspace = this.isWithinWorkspace(normalized);
    if (!withinWorkspace) {
      return {
        valid: false,
        normalizedPath: normalized,
        error: `Path outside workspace: ${filePath}`,
        errorCode: 'OUTSIDE_WORKSPACE',
      };
    }

    // 5. Check denied paths
    if (this.isDeniedPath(normalized)) {
      return {
        valid: false,
        normalizedPath: normalized,
        error: `Access denied to path: ${filePath}`,
        errorCode: 'DENIED_PATH',
      };
    }

    // 6. Check symlinks if configured
    if (!this.config.allowSymlinks) {
      const symlinkCheck = this.checkSymlinks(normalized);
      if (!symlinkCheck.valid) {
        return symlinkCheck;
      }
    }

    return {
      valid: true,
      normalizedPath: normalized,
    };
  }

  /**
   * Normalize path (resolve .. and .)
   */
  private normalizePath(filePath: string): string {
    // Resolve relative paths against first workspace root
    const workspace = this.config.allowedRoots[0] || process.cwd();
    
    if (path.isAbsolute(filePath)) {
      return path.normalize(filePath);
    }

    return path.resolve(workspace, filePath);
  }

  /**
   * Check for path traversal attempts (../)
   */
  private hasTraversalAttempt(filePath: string): boolean {
    // Check for .. in the path
    const parts = filePath.split(/[/\\]/);
    for (const part of parts) {
      if (part === '..') {
        return true;
      }
    }

    // Check for encoded traversal
    const decoded = decodeURIComponent(filePath);
    if (decoded.includes('..')) {
      return true;
    }

    return false;
  }

  /**
   * Check if path is within allowed workspace
   */
  private isWithinWorkspace(normalizedPath: string): boolean {
    for (const root of this.config.allowedRoots) {
      const resolvedRoot = path.resolve(root);
      if (normalizedPath.startsWith(resolvedRoot + path.sep) || normalizedPath === resolvedRoot) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if path is in denied list
   */
  private isDeniedPath(normalizedPath: string): boolean {
    if (!this.config.deniedPaths) {
      return false;
    }

    for (const denied of this.config.deniedPaths) {
      if (normalizedPath.startsWith(denied)) {
        return true;
      }
    }

    // System paths that should always be denied
    const systemPaths = [
      '/etc',
      '/proc',
      '/sys',
      '/dev',
      'C:\\Windows',
      'C:\\Program Files',
    ];

    for (const sysPath of systemPaths) {
      if (normalizedPath.startsWith(sysPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path escapes workspace via symlinks
   */
  private checkSymlinks(normalizedPath: string): PathValidationResult {
    try {
      if (!fs.existsSync(normalizedPath)) {
        // File doesn't exist yet, that's OK for write operations
        return { valid: true, normalizedPath };
      }

      const realPath = fs.realpathSync(normalizedPath);
      const isWithin = this.isWithinWorkspace(realPath);

      if (!isWithin) {
        return {
          valid: false,
          normalizedPath,
          error: `Symlink escapes workspace: ${normalizedPath} → ${realPath}`,
          errorCode: 'SYMLINK_ESCAPE',
        };
      }

      return { valid: true, normalizedPath: realPath };
    } catch {
      // If we can't resolve, allow it (will fail at execution)
      return { valid: true, normalizedPath };
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a path security instance for a workspace
 */
export function createPathSecurity(workspace: string): PathSecurity {
  return new PathSecurity({
    allowedRoots: [workspace],
    allowSymlinks: false,
  });
}

/**
 * Quick check if path is safe
 */
export function isPathSafe(filePath: string, workspace: string): boolean {
  const security = createPathSecurity(workspace);
  return security.validate(filePath).valid;
}
