# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha] - 2026-08-04

### Added
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

### Changed
- Core is now feature-frozen
- All new features must be plugins

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
- Real Gemini provider integration
- E2E browser tests
- Performance benchmarks
- Build size optimization
