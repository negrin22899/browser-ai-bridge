# ADR-008: Strategic Architecture Roadmap

**Date:** 2026-08-10  
**Status:** Accepted

## Context

We have identified several strategic architectural goals that will shape the future of Browser AI Bridge. These should be implemented in a specific order to maximize value and minimize disruption.

## Decision

We fix the following order for strategic architecture features:

### Order of Implementation

1. **Capability Negotiation**
2. **AI Debugger**
3. **MCP Adapter**
4. **Replaceable Browser Layer**
5. **Session Fabric**
6. **Runtime Providers**

### Each Feature Requires ADR/RFC

Before implementing any strategic feature:
1. Create dedicated ADR/RFC
2. Analyze impact on existing systems
3. Design using existing components first
4. Only modify Core if absolutely necessary

---

## 1. Capability Negotiation

**Goal:** System automatically computes available toolset based on:
- AI Provider capabilities
- Runtime capabilities
- User permissions

**Example:**
```json
{
  "provider": {
    "text": true,
    "vision": true,
    "files": true,
    "streaming": true
  },
  "runtime": {
    "filesystem": true,
    "git": true,
    "terminal": true,
    "browser": true
  },
  "permissions": {
    "filesystem.read": true,
    "filesystem.write": "confirm",
    "git.status": true,
    "terminal.execute": "confirm"
  }
}
```

**Uses:** Existing Capability System, Permission Engine

---

## 2. AI Debugger

**Goal:** Transform Recorder/Replay into a full debugging tool.

**Features:**
- Trace visualization
- Step-by-step replay
- Inspect tool calls
- Inspect permissions
- Export traces

**Uses:** Existing Recorder, Replay, Event Bus

---

## 3. MCP Adapter

**Goal:** MCP becomes an adapter, not a foundation.

**Direction:**
```
MCP Adapter → Bridge Tool System → Runtime

BAB Tools → MCP Server → External AI Agent
```

**Uses:** Existing Tool SDK, Bridge Protocol

---

## 4. Replaceable Browser Layer

**Goal:** Browser interface is swappable.

**Options:**
```
Browser Interface
      │
 ┌────┼─────┐
 ▼    ▼     ▼
Playwright CDP Extension
```

**Uses:** Existing PlaywrightProvider, SiteAdapter

---

## 5. Session Fabric

**Goal:** Rich sessions with full state.

**Session includes:**
- Provider
- Browser Context
- Workspace
- Runtime State
- Permissions
- Tool State
- History
- Recording
- Metadata

**Multi-session:** Session A → Gemini, Session B → ChatGPT simultaneously

**Uses:** Existing SessionManager, EventBus

---

## 6. Runtime Providers

**Goal:** Separate AI provider from machine.

**Runtime Providers:**
- Local Machine
- WSL
- Docker
- SSH
- Remote

**Uses:** Existing Runtime, Tool SDK

---

## Implementation Rules

1. **Use existing components first**
   - Plugin SDK
   - Provider SDK
   - Tool SDK
   - Event Bus
   - Permission Engine
   - Bridge Protocol
   - Capability System

2. **Don't modify Core for future features**
   - Core remains stable
   - New features through plugins/adapters

3. **Each feature = separate ADR/RFC**
   - Design before implementation
   - Review before coding

---

## Ссылки

- [Capability System](../packages/protocol/src/types/capabilities.ts)
- [Permission Engine](../packages/runtime/src/permission-engine.ts)
- [Recorder](../packages/core/src/recorder.ts)
- [Replay](../packages/core/src/replay.ts)
- [Bridge Protocol](../packages/protocol/src/types/bridge-protocol.ts)
