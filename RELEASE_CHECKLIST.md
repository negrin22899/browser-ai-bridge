# Release Checklist - v0.2-alpha

## Pre-Release Audit

### Code Quality

- [ ] No TODO/FIXME/HACK/XXX/STUB in production code (P3 stubs remain: CDP/Extension adapters, Docker/WSL/SSH runtimes, MCP adapter)
- [ ] All `any` types documented or replaced (26 found)
- [ ] All error messages are user-friendly
- [ ] No dead code

### Security

- [x] `npm audit` - 3 vulnerabilities (1 moderate, 2 high)
- [ ] All dependencies have compatible licenses
- [ ] No secrets in code
- [ ] No hardcoded credentials

### Testing

- [x] Unit tests: 294 passing
- [x] Integration tests: 28 passing
- [ ] E2E tests: Not implemented
- [ ] Performance tests: Not implemented

### Documentation

- [x] README.md exists
- [x] ARCHITECTURE_DECISIONS.md exists
- [x] KNOWN_LIMITATIONS.md exists
- [x] Provider SDK Guide
- [x] Tool SDK Guide
- [x] Plugin SDK Guide
- [x] Roadmap

### Build

- [x] All packages build successfully
- [x] No TypeScript errors
- [ ] Build size optimized
- [ ] Source maps generated

### Dependencies

- [x] All dependencies installed
- [ ] License check completed
- [ ] No unused dependencies

## Release Artifacts

- [ ] CHANGELOG.md created
- [ ] Version bumped to 0.2.0-alpha
- [ ] Git tag created
- [ ] GitHub release created

## Post-Release

- [ ] Monitor for issues
- [ ] Respond to feedback
- [ ] Plan v0.3

## Critical Issues

### Must Fix Before Release

1. **`any` types in main.ts** - Desktop app has 14 `any` types
2. **npm audit vulnerabilities** - 3 vulnerabilities need fixing
3. ~~**Mock data in Dashboard**~~ - fixed: all dashboard stats now use real API data

### Should Fix Soon

1. **No E2E tests** - Need browser automation tests
2. **No performance benchmarks** - Need baseline metrics
3. **Build size not optimized** - Need tree-shaking

### Nice to Have

1. **Source maps** - For debugging
2. **CHANGELOG** - For tracking changes
3. **Automated releases** - GitHub Actions

## Sign-Off

- [ ] Code review completed
- [ ] Security review completed
- [ ] Documentation review completed
- [ ] Ready for release
