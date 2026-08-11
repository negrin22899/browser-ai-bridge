# ADR-006: Plugin Trust Model

**Date:** 2026-08-10  
**Status:** Accepted

## Context

Plugins can access Runtime capabilities (filesystem, git, shell, etc.). Not all plugins should have the same level of access. We need a trust model that:
- Allows users to control plugin permissions
- Prevents malicious plugins from accessing sensitive resources
- Enables a future Plugin Marketplace with different trust levels

## Decision

We adopt a three-level trust model:

### Trust Levels

```
Untrusted
    ↓
Sandboxed
    ↓
Trusted
```

### Untrusted (Default)

New plugins start as untrusted.

**Allowed:**
- Read plugin metadata
- Register providers/tools declarations
- Access event bus (read-only)

**Denied:**
- Filesystem access
- Shell access
- Network access
- Git access
- Access to other plugins' state

### Sandboxed

User explicitly grants limited capabilities.

**Allowed:**
- Declared tools (user-approved)
- Limited filesystem (user-specified paths)
- Event bus (read/write)

**Denied:**
- Shell access (unless explicitly granted)
- Network access (unless explicitly granted)
- Access to credentials
- Access to other sessions

### Trusted

Full access to declared capabilities.

**Allowed:**
- All declared capabilities
- Full Runtime access (within permission scope)
- Event bus (full access)
- Configuration read/write

**Denied:**
- Access to credentials
- Cross-session access

---

## Capability Declaration

Plugins declare capabilities in manifest:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "capabilities": {
    "filesystem": {
      "read": true,
      "write": ["./data"]
    },
    "network": {
      "hosts": ["api.example.com"]
    },
    "tools": ["my-tool.execute"]
  }
}
```

## Capability Grant Flow

```
Plugin Manifest
      ↓
Requested Capabilities
      ↓
User Review (UI/CLI)
      ↓
Permission Engine
      ↓
Granted Capabilities
      ↓
Plugin Runtime
```

## Revocation

User can revoke capabilities at any time:
- Via Dashboard UI
- Via CLI command
- Via configuration file

Revoked capabilities immediately take effect.

## Logging

All plugin actions are logged:
- `plugin.loaded` — plugin loaded with capabilities
- `plugin.capability.granted` — capability granted
- `plugin.capability.revoked` — capability revoked
- `tool.executed` — tool executed by plugin
- `permission.denied` — capability denied

---

## Consequences

- Plugins must declare capabilities upfront
- Users must explicitly grant capabilities
- Untrusted plugins have minimal access
- Trust level is visible in Dashboard
- Plugin Marketplace can use trust levels for filtering
