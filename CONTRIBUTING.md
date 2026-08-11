# Contributing to Browser AI Bridge

Thank you for your interest in contributing to Browser AI Bridge!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Build the project: `npm run build`
5. Run tests: `npm test`

## Development Setup

```bash
# Clone the repo
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development
npm run dev
```

## Project Structure

```
browser-ai-bridge/
├── apps/
│   ├── cli/          # CLI tool
│   ├── dashboard/    # Web dashboard
│   └── desktop/      # Electron app
├── packages/
│   ├── api/          # API server
│   ├── core/         # Core packages
│   ├── protocol/     # Protocol types
│   ├── runtime/      # Runtime engine
│   ├── plugin-sdk/   # Plugin SDK
│   ├── playwright-provider/  # Browser automation
│   └── tools/        # Built-in tools
├── plugins/          # Provider plugins
└── tests/            # Integration tests
```

## How to Contribute

### Reporting Bugs

1. Check existing issues
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details

### Suggesting Features

1. Create an issue with:
   - Feature description
   - Use case
   - Proposed implementation (optional)

### Submitting Code

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Add tests
4. Run tests: `npm test`
5. Commit with clear message
6. Push to your fork
7. Create a Pull Request

### Code Style

- TypeScript
- ESLint configuration
- Prettier formatting
- Clear variable names
- Comments for complex logic

### Testing

- Unit tests for new features
- Integration tests for providers
- Run all tests before submitting

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --grep "my test"
```

### Documentation

- Update README if needed
- Add JSDoc comments
- Update API documentation

## Architecture Decisions

For major changes, create an ADR (Architecture Decision Record):

1. Create `ARCHITECTURE_DECISIONS/ADR-XXX-title.md`
2. Describe context, decision, and consequences
3. Get approval before implementing

## Plugin Development

See [Plugin SDK Guide](./docs/plugin-sdk.md) for creating plugins.

## Provider Development

See [Provider SDK Guide](./docs/provider-sdk.md) for creating providers.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- GitHub Issues: https://github.com/negrin22899/browser-ai-bridge/issues
- Discussions: https://github.com/negrin22899/browser-ai-bridge/discussions
