# Browser AI Bridge - Roadmap

## Vision

**Open Runtime for AI Providers**

Browser AI Bridge is not just a bridge to browser AI. It's an operating environment for AI providers. Whether browser-based, API, or local models - they all plug into the same runtime.

## Version Stages

### v0.1 - Foundation ✅
- Monorepo structure
- Core packages (EventBus, Logger, Config)
- Protocol types
- Basic tests

### v0.2 - First Working Provider
- One fully working Provider (Gemini)
- End-to-end: OpenCode → Bridge → Gemini → Browser → Tools → Response
- No stubs, no mocks
- Integration tests

### v0.3 - First External User
- SDK documentation
- Provider Validation Suite
- Easy plugin development
- User can write a Provider in one evening

### v0.4 - Stable Plugin SDK
- Plugin system fully working
- Multiple providers as plugins
- Tools as plugins
- Community contributions

### v0.5 - Production Ready
- Comprehensive tests
- Performance optimization
- Error handling
- Monitoring and logging
- Security audit

### v1.0 - Public Release
- Stable API
- Full documentation
- Compatibility matrix
- Community ecosystem

## Current Status

**We are at: v0.1 → v0.2**

Priority: Make Gemini provider work end-to-end.

## Compatibility Matrix

| Capability | Gemini | ChatGPT | Claude | DeepSeek |
|------------|--------|---------|--------|----------|
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Images | ✅ | ✅ | ✅ | ❌ |
| Files | ✅ | ✅ | ✅ | ❌ |
| Thinking | ✅ | ✅ | ✅ | ✅ |
| Tool Calling | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Web Search | ✅ | ✅ | ❌ | ❌ |
| Markdown | ✅ | ✅ | ✅ | ✅ |
| Code Generation | ✅ | ✅ | ✅ | ✅ |
| Browser Automation | ✅ | ✅ | ✅ | ✅ |

Legend:
- ✅ Fully supported
- ⚠️ Partial support (via Tool Negotiation)
- ❌ Not supported

## Architecture Principles

1. **Core is frozen** - No new features without proof it can't be a plugin
2. **Everything is a plugin** - Providers, Tools, Extensions
3. **Bridge Protocol is the standard** - External APIs are adapters
4. **Validation first** - Every Provider must pass validation suite
5. **Documentation driven** - If it's not documented, it doesn't exist

## What We Don't Do (Yet)

- ❌ Marketplace
- ❌ Cloud sync
- ❌ User authentication
- ❌ Own LLM
- ❌ Complex analytics

These can be added after v1.0 if needed.

## How to Contribute

1. Pick an issue
2. Read the SDK docs
3. Write a plugin
4. Run validation suite
5. Submit PR

## Links

- [Provider SDK Guide](./provider-sdk.md)
- [Tool SDK Guide](./tool-sdk.md)
- [Plugin SDK Guide](./plugin-sdk.md)
