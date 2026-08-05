# Contributing to Browser AI Bridge

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/browser-ai-bridge.git
cd browser-ai-bridge

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Development Workflow

### 1. Find an Issue

- Check [GitHub Issues](https://github.com/your-org/browser-ai-bridge/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Changes

- Follow the coding style (TypeScript strict mode)
- Write tests for new features
- Update documentation if needed

### 4. Run Tests

```bash
# Unit tests
npm test -w packages/core
npm test -w packages/runtime
npm test -w packages/prompt-engine

# Integration tests
cd tests/integration && npx vitest run
```

### 5. Submit a Pull Request

- Push your branch
- Create a PR with clear description
- Link the issue being fixed
- Wait for review

## Coding Standards

### TypeScript

- Use strict mode
- Avoid `any` types (document if necessary)
- Use explicit return types for functions
- Use interfaces for object shapes

### Testing

- Write unit tests for all new code
- Aim for 80%+ coverage
- Use descriptive test names
- Mock external dependencies

### Documentation

- Update README if adding features
- Add JSDoc comments for public APIs
- Include examples in documentation

## Project Structure

```
browser-ai-bridge/
├── apps/              # Runnable applications
│   ├── cli/           # CLI interface
│   ├── dashboard/     # Web dashboard
│   └── desktop/       # Electron app
├── packages/          # Shared libraries
│   ├── core/          # Core services
│   ├── protocol/      # Type definitions
│   ├── runtime/       # Runtime engine
│   └── ...
├── plugins/           # Plugin implementations
├── docs/              # Documentation
└── tests/             # Integration tests
```

## Architecture

See [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) for key decisions.

**Core is frozen.** New features should be implemented as plugins.

## Plugin Development

See [Plugin SDK Guide](./docs/plugin-sdk.md) for creating plugins.

### Creating a Provider

See [Provider SDK Guide](./docs/provider-sdk.md).

### Creating a Tool

See [Tool SDK Guide](./docs/tool-sdk.md).

## Code Review

All PRs require review before merging:

1. **Functionality** - Does it work correctly?
2. **Tests** - Are there adequate tests?
3. **Documentation** - Is it documented?
4. **Style** - Does it follow coding standards?
5. **Security** - Are there security concerns?

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Create GitHub release
5. Publish to npm (if applicable)

## Getting Help

- GitHub Issues: For bugs and feature requests
- Discussions: For questions and ideas
- Discord: [Link to Discord] (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you to all contributors who help make Browser AI Bridge better!
