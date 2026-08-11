# ADR-007: Architecture Policy

**Date:** 2026-08-10  
**Status:** Accepted

## Context

As the project grows, we need a clear policy for architectural changes to prevent Core from becoming bloated and unstable.

## Decision

All major architectural changes must follow this policy:

### Core Feature Freeze

Core is feature-frozen. No new features will be added to Core without proof that they cannot be implemented as plugins.

### Pre-change Checklist

Before changing Core, answer these questions:

1. **Can it be a Plugin?** → Use Plugin SDK
2. **Can it be a Provider?** → Use Provider SDK
3. **Can it be a Tool?** → Use Tool SDK
4. **Can it be an Adapter?** → Use Bridge Protocol
5. **Can it use Event Bus?** → Use existing events
6. **Can it use Capability System?** → Use existing capabilities

If the answer to any question is "yes" — do NOT change Core.

### ADR/RFC Requirement

All architectural changes must be documented as an ADR (Architecture Decision Record) or RFC (Request for Comments) before implementation.

### Change Categories

| Category | Requirement | Examples |
|----------|-------------|----------|
| New feature in Core | RFC + Proof it can't be a plugin | New event type |
| Breaking change in Protocol | RFC + Major version bump | New required field |
| New Plugin capability | ADR | New tool type |
| New Provider feature | ADR | New capability |

### Review Process

1. Create ADR/RFC document
2. Review by maintainers
3. Approve/reject
4. Implement if approved

## Consequences

- Core remains small and stable
- Plugin developers can rely on stable Core API
- Breaking changes are rare and well-documented
- New features are added through plugins

## Examples

### ❌ Wrong: Adding new tool to Core

```
// BAD: Adding docker tool directly to Core
packages/tools/docker/
```

### ✅ Right: Creating docker tool as plugin

```
// GOOD: Docker tool as external plugin
plugins/tool-docker/
```

### ❌ Wrong: Adding new provider to Core

```
// BAD: Adding provider directly to Core
packages/providers/openai/
```

### ✅ Right: Creating provider as plugin

```
// GOOD: Provider as external plugin
plugins/provider-openai/
```

---

## Ссылки

- [ADR-001: Core Feature Freeze](./ADR-001-core-feature-freeze.md)
- [ADR-002: Everything is a Plugin](./ADR-002-everything-is-a-plugin.md)
- [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md)
