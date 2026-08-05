# Known Limitations

This document lists current limitations of Browser AI Bridge.

## v0.2 Limitations

### Provider Integration

| Limitation | Status | Workaround |
|------------|--------|------------|
| Only Gemini provider implemented | In Progress | ChatGPT, Claude planned for v0.3 |
| Provider connects to new browser profile | Known Issue | Manual login required |
| No persistent browser sessions | Known Issue | Re-login on each restart |

### Tool System

| Limitation | Status | Workaround |
|------------|--------|------------|
| Limited tool set (fs, git, shell) | Expected | More tools via plugins |
| No tool result streaming | Expected | Full response returned at once |
| Shell tool requires confirmation | By Design | Security feature |

### API

| Limitation | Status | Workaround |
|------------|--------|------------|
| OpenAI API only | Expected | Anthropic adapter planned |
| No WebSocket support | Expected | SSE streaming only |
| No rate limiting | Known Issue | Manual throttling |

### UI

| Limitation | Status | Workaround |
|------------|--------|------------|
| Dashboard uses mock data | In Progress | Real data integration planned |
| Runtime Inspector is simulated | In Progress | Real metrics planned |
| No dark mode for all pages | Known Issue | Partial implementation |

### Testing

| Limitation | Status | Workaround |
|------------|--------|------------|
| Integration tests use mock provider | Expected | Real provider tests planned |
| No E2E browser tests | Expected | Playwright tests planned |
| No performance benchmarks | Expected | Benchmarks planned for v0.5 |

## Technical Debt

### Must Fix (v0.2)

- [ ] Remove mock provider from integration tests
- [ ] Implement real Gemini provider connection
- [ ] Add proper error handling for browser automation
- [ ] Implement browser session persistence

### Should Fix (v0.3)

- [ ] Add comprehensive logging
- [ ] Implement retry logic for provider connections
- [ ] Add timeout handling for all operations
- [ ] Improve error messages

### Nice to Have (v0.4+)

- [ ] Add metrics collection
- [ ] Implement caching layer
- [ ] Add plugin hot-reload
- [ ] Support multiple browser profiles

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Supported | Primary target |
| Firefox | ⚠️ Partial | Playwright supports, not tested |
| Safari | ⚠️ Partial | Playwright supports, not tested |
| Edge | ✅ Supported | Chromium-based |

## AI Service Compatibility

| Service | Status | Notes |
|---------|--------|-------|
| Gemini | ✅ Working | Browser automation |
| ChatGPT | 🔲 Planned | v0.3 |
| Claude | 🔲 Planned | v0.3 |
| DeepSeek | 🔲 Planned | v0.4 |
| Local Models | 🔲 Planned | v0.5 |

## Security Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No sandboxing | Medium | Scope-based permissions |
| Browser has full access | Medium | User confirmation for dangerous ops |
| No audit export | Low | Planned for v0.3 |

## Performance Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Browser automation is slow | Medium | Expected for browser-based providers |
| No connection pooling | Low | Planned for v0.4 |
| No response caching | Low | Planned for v0.5 |

## Documentation Limitations

| Limitation | Status |
|------------|--------|
| No API reference | Planned for v0.3 |
| No video tutorials | Planned for v0.4 |
| No migration guide | Not needed yet |

## Reporting Issues

If you find a limitation not listed here, please open an issue:
1. Describe the limitation
2. Expected behavior
3. Actual behavior
4. Steps to reproduce

## Contributing

Want to help fix a limitation? See [CONTRIBUTING.md](./CONTRIBUTING.md).
