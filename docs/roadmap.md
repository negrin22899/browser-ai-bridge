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

### v0.2 - All Major Providers ✅
- All major providers working (Gemini, ChatGPT, Claude, DeepSeek)
- End-to-end: OpenCode → Bridge → Provider → Browser → Tools → Response
- No stubs, no mocks
- Integration tests for all providers
- Provider Validation Suite
- SDK Documentation

### v0.3 - First External User ✅
- Easy plugin development with Builder pattern
- User can write a Provider in one evening
- Anthropic API adapter
- Google API adapter
- Browser session persistence
- Real streaming support
- Plugin hot-reload
- Plugin validation tools
- Comprehensive plugin development guide

### v0.4 - Stable Plugin SDK ✅
- Plugin system fully working
- Tools as plugins (ToolPlugin, ToolPluginBuilder)
- Chrome extension for browser integration
- Multiple browser profiles support
- Rate limiting for API server
- WebSocket support for real-time communication

### v0.5 - Production Ready ✅
- Comprehensive unit and integration tests
- Performance optimization with caching
- Custom error classes and error handling
- Structured logging system
- Metrics collection and Prometheus export
- Response caching layer

### v1.0 - Public Release ✅
- Stable API (frozen)
- Full API documentation
- Compatibility matrix
- Community ecosystem (issue templates, PR templates, CODEOWNERS)
- Security policy updated

## Current Status

**We are at: v1.0 ✅**

All v1.0 features are complete:
- ✅ Stable API (frozen)
- ✅ Full API documentation (api-reference.md)
- ✅ Compatibility matrix (compatibility-matrix.md)
- ✅ Community ecosystem files
- ✅ Security policy updated

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
| API Access | ✅ | ❌ | ✅ | ❌ |

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
