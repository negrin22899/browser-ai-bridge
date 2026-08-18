# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Tool execution loop** in `/v1/chat/completions` — tool_calls/actions are executed through PermissionEngine + ToolDispatcher and results fed back until the AI answers.
- `--allow` CLI flag to pre-authorize tools (e.g. `--allow fs.write,shell.exec`).
- `DELETE /v1/sessions/:id`, `/v1/audit`, `/v1/config`, `/v1/extensions` endpoints.
- Dashboard wired to real data: Providers, Logs, Extensions, Settings, session deletion.
- Full Prometheus metrics (request totals/durations, per-provider requests/errors).
- Deterministic integration-test CI job.

### Changed
- `cancel()` implemented for Playwright providers and connected to HTTP stream abort.
- Graceful shutdown (SIGINT/SIGTERM) closes the browser and stops the runtime.
- CI now fails when unit tests fail.

### Fixed
- Removed 4 duplicated `BrowserManager` implementations from provider plugins.
- Fixed `workspace:*` dependency declarations (normalized to `*`).
- Fixed plugin lifecycle events not declared in the EventBus event map.
- Fixed stale tests and test scripts; build and test suite now pass cleanly.
- Fixed `ProfileManager` ID collision when creating profiles in the same millisecond.

## [1.0.0] - 2026-08-08

### Added
- **Stable API** - API frozen for production use
- **API Documentation** - Full API reference (docs/api-reference.md)
- **Compatibility Matrix** - Full compatibility documentation (docs/compatibility-matrix.md)
- **Community Ecosystem** - Issue templates, PR templates, CODEOWNERS
- **Security Policy** - Updated for v1.0

### Changed
- Version bumped to 1.0.0
- All packages updated to stable version

## [0.5.0] - 2026-08-08

### Added
- **Comprehensive Tests** - Unit tests for all new packages
- **Performance Optimization** - LRU cache with TTL support
- **Error Handling** - Custom error classes (BABError, ProviderError, etc.)
- **Logging System** - Structured logging with multiple outputs
- **Metrics Collection** - Prometheus-compatible metrics export
- **Response Caching** - Cache layer for AI responses

### Changed
- API server now includes caching, metrics, and improved error handling
- Updated roadmap to reflect v0.5 completion

## [0.4.0] - 2026-08-08

### Added
- **Chrome Extension** - Browser extension for AI provider integration
- **Multiple Browser Profiles** - Support for different browser profiles
- **Rate Limiting** - API rate limiting with configurable limits
- **WebSocket Support** - Real-time communication via WebSocket
- **Tool Plugin System** - Tools can now be loaded as plugins
- **ToolPluginBuilder** - Fluent API for creating tool plugins

### Changed
- Plugin system now fully supports tools as plugins
- API server now includes rate limiting middleware
- Updated roadmap to reflect v0.4 completion

## [0.3.0] - 2026-08-08

### Added
- **Plugin Builder** - Fluent API for creating plugins (`createPlugin()`, `createProviderPlugin()`, `createToolPlugin()`)
- **Plugin Validator** - Validate plugin structure and implementation
- **Plugin Hot-Reload** - Reload plugins without restarting
- **Anthropic API Adapter** - Direct API access to Claude
- **Google API Adapter** - Direct API access to Gemini
- **Browser Session Persistence** - Save and restore sessions
- **Real Streaming** - Stream responses as they are generated
- **Retry Logic** - Exponential backoff for connections
- Plugin development guide with new features

### Changed
- Plugin SDK now supports builder pattern for easier development
- PluginLoader now supports file watching for hot-reload
- Updated roadmap to reflect v0.3 completion

## [0.2.0-alpha] - 2026-08-08

### Added
- **ChatGPT Provider** - Real browser automation via chatgpt.com
- **Claude Provider** - Real browser automation via claude.ai
- **DeepSeek Provider** - Real browser automation via chat.deepseek.com
- Provider Validation Suite
- SDK Documentation (Provider, Tool, Plugin)
- Architecture Decisions document
- Known Limitations document
- Release Checklist
- Security Policy
- Contributing Guide
- Code of Conduct
- GitHub Issue/PR templates
- GitHub Actions CI
- Integration tests for all providers
- CLI `providers` command to list available providers

### Changed
- Core is now feature-frozen
- All new features must be plugins
- Updated Playwright adapters with accurate selectors for all providers
- Improved CLI with provider name detection (gemini, chatgpt, claude, deepseek)
- Updated Known Limitations to reflect all providers working

### Fixed
- npm audit vulnerabilities (partial)

## [0.1.0] - 2026-08-03

### Added
- Initial monorepo structure
- Core packages (EventBus, Logger, Config, SessionManager, Router)
- Protocol types and interfaces
- Runtime Engine (ToolDispatcher, PermissionEngine, AuditLogger)
- Prompt Engine with Tool Negotiation
- OpenAI-compatible API (Hono)
- Playwright Provider with site adapters
- Plugin SDK
- Web Dashboard (React + Tailwind)
- Electron Desktop App
- CLI interface
- 146 unit and integration tests

### Architecture
- Event-driven design
- Scope-based permissions
- Bridge Protocol internal standard
- Recording and Replay system

## [Unreleased]

### Planned
- Chrome extension
- Multiple browser profiles
- Rate limiting
- WebSocket support
- Metrics collection
- Caching layer
