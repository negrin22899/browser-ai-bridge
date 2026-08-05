# Architecture Decisions

This document records key architectural decisions for Browser AI Bridge.

## ADR-001: Core Feature Freeze

**Date:** 2026-08-04
**Status:** Accepted

### Context
Core has reached sufficient maturity. Adding features to Core creates instability and makes it harder for plugin developers.

### Decision
Core is feature-frozen. No new features will be added to Core without proof that they cannot be implemented as plugins.

### Consequences
- All new features go through Plugin SDK, Provider SDK, or Tool SDK
- Core changes require RFC process
- Plugin developers can rely on stable Core API

---

## ADR-002: Everything is a Plugin

**Date:** 2026-08-04
**Status:** Accepted

### Context
The project needs to support multiple AI providers (Gemini, ChatGPT, Claude, etc.) and tools (git, shell, filesystem, etc.). Hard-coding these creates maintenance burden.

### Decision
All providers, tools, and extensions are implemented as plugins. Core only provides the runtime and plugin system.

### Consequences
- Providers are plugins in `plugins/`
- Tools are plugins in `plugins/`
- Extensions are plugins in `plugins/`
- Core remains small and stable

---

## ADR-003: Bridge Protocol as Internal Standard

**Date:** 2026-08-04
**Status:** Accepted

### Context
Multiple external APIs (OpenAI, Anthropic, Google) need to be supported. Direct conversion between each pair creates N×M complexity.

### Decision
Bridge Protocol is the internal standard. External APIs are adapters that convert to/from Bridge Protocol.

### Consequences
- OpenAI API → Bridge Protocol → Provider
- Anthropic API → Bridge Protocol → Provider
- Google API → Bridge Protocol → Provider
- Adding new API requires only one adapter

---

## ADR-004: Provider Validation Suite

**Date:** 2026-08-04
**Status:** Accepted

### Context
Third-party developers need to know if their Provider implementation is correct.

### Decision
Every Provider must pass the Provider Validation Suite before it can be registered.

### Consequences
- Validation tests: interface, capabilities, health, connect, send, stream, disconnect
- Validation report shows pass/fail for each test
- Plugin developers get immediate feedback

---

## ADR-005: Scope-Based Permissions

**Date:** 2026-08-03
**Status:** Accepted

### Context
AI providers need to execute tools (read files, run commands, etc.). Security is critical.

### Decision
Permission Engine uses scope-based permissions with three modes:
- **Auto**: Read-only operations (no confirmation)
- **Confirm**: Write operations (user must confirm)
- **Deny**: Dangerous operations (always blocked)

### Consequences
- `fs.read` → Auto
- `fs.write` → Confirm
- `shell.exec` → Confirm
- `sudo` → Deny

---

## ADR-006: Tool Negotiation Protocol

**Date:** 2026-08-03
**Status:** Accepted

### Context
AI providers need to know what tools are available and how to call them. OpenAI function calling format is too complex for browser-based AI.

### Decision
Use custom Tool Negotiation format: `{"actions": [...]}`

### Consequences
- Simpler than OpenAI function calling
- Works with any AI (even without native tool support)
- Prompt Engine generates system prompt with tool descriptions

---

## ADR-007: No Token Storage

**Date:** 2026-08-03
**Status:** Accepted

### Context
Security is paramount. Storing API tokens creates risk.

### Decision
No tokens are stored on disk. All authentication happens through the browser.

### Consequences
- Browser-based providers use existing login sessions
- API providers require tokens passed at runtime
- No `.env` files with secrets

---

## ADR-008: Playwright as Primary Browser Automation

**Date:** 2026-08-03
**Status:** Accepted

### Context
Browser automation is needed for browser-based AI providers. Multiple options exist (Puppeteer, Selenium, Playwright).

### Decision
Playwright is the primary browser automation tool.

### Consequences
- Cross-browser support (Chrome, Firefox, Safari)
- Built-in CDP support
- Active maintenance and community
- Site adapters abstract browser-specific logic

---

## ADR-009: Event-Driven Architecture

**Date:** 2026-08-03
**Status:** Accepted

### Context
Components need to communicate without tight coupling. UI should not directly call Runtime.

### Decision
All communication goes through EventBus. No direct calls between UI and Runtime.

### Consequences
- Components are loosely coupled
- Easy to add logging, recording, replay
- UI can subscribe to events for real-time updates

---

## ADR-010: Recording and Replay

**Date:** 2026-08-04
**Status:** Accepted

### Context
Debugging AI interactions is difficult. Users need to see what happened.

### Decision
All actions are recorded. Recordings can be replayed for debugging.

### Consequences
- Recorder captures all requests, responses, tool calls
- Replay reproduces exact sequence
- Useful for bug reports and debugging
