# Browser AI Bridge - Compatibility Matrix

## AI Provider Compatibility

### Browser-Based Providers

| Provider | URL | Status | Streaming | Images | Files | Tools |
|----------|-----|--------|-----------|--------|-------|-------|
| Gemini | gemini.google.com | ✅ Full | ✅ | ✅ | ✅ | ⚠️ |
| ChatGPT | chatgpt.com | ✅ Full | ✅ | ✅ | ✅ | ⚠️ |
| Claude | claude.ai | ✅ Full | ✅ | ✅ | ✅ | ⚠️ |
| DeepSeek | chat.deepseek.com | ✅ Full | ✅ | ❌ | ❌ | ❌ |

### API-Based Providers

| Provider | API | Status | Streaming | Images | Files | Tools |
|----------|-----|--------|-----------|--------|-------|-------|
| Anthropic | Messages API | ✅ Full | ✅ | ✅ | ✅ | ✅ |
| Google | Generative AI | ✅ Full | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Full - Fully supported
- ⚠️ Partial - Partial support via Tool Negotiation
- ❌ None - Not supported

---

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Primary | Full support, primary target |
| Edge | ✅ Supported | Chromium-based, full support |
| Firefox | ⚠️ Partial | Playwright supports, not fully tested |
| Safari | ⚠️ Partial | Playwright supports, not fully tested |
| Opera | ⚠️ Partial | Chromium-based, should work |

---

## Operating System Compatibility

| OS | Status | Notes |
|----|--------|-------|
| Windows 10/11 | ✅ Full | Primary development platform |
| macOS (Intel) | ✅ Full | Full support |
| macOS (Apple Silicon) | ✅ Full | Full support |
| Ubuntu 20.04+ | ✅ Full | Full support |
| Debian 11+ | ✅ Full | Full support |
| Fedora 35+ | ✅ Full | Full support |
| Arch Linux | ✅ Full | Full support |

---

## Node.js Compatibility

| Version | Status | Notes |
|---------|--------|-------|
| Node.js 18.x | ⚠️ Minimum | Minimum supported version |
| Node.js 20.x | ✅ Recommended | Recommended version |
| Node.js 22.x | ✅ Full | Full support |

---

## IDE Compatibility

| IDE | Status | Integration |
|-----|--------|-------------|
| VS Code | ✅ Full | OpenAI-compatible API |
| Cursor | ✅ Full | OpenAI-compatible API |
| JetBrains IDEs | ✅ Full | OpenAI-compatible API |
| Neovim | ✅ Full | OpenAI-compatible API |
| Emacs | ✅ Full | OpenAI-compatible API |

---

## Feature Compatibility Matrix

| Feature | Gemini | ChatGPT | Claude | DeepSeek |
|---------|--------|---------|--------|----------|
| Chat Completion | ✅ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Multi-turn | ✅ | ✅ | ✅ | ✅ |
| System Prompts | ✅ | ✅ | ✅ | ✅ |
| Image Input | ✅ | ✅ | ✅ | ❌ |
| File Input | ✅ | ✅ | ✅ | ❌ |
| Web Search | ✅ | ✅ | ❌ | ❌ |
| Code Generation | ✅ | ✅ | ✅ | ✅ |
| Markdown | ✅ | ✅ | ✅ | ✅ |
| Tool Calling | ⚠️ | ⚠️ | ⚠️ | ❌ |

---

## API Compatibility

### OpenAI API Compatibility

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /v1/chat/completions | ✅ Full | Full compatibility |
| POST /v1/responses | ✅ Full | Full compatibility |
| GET /v1/models | ✅ Full | Full compatibility |
| GET /health | ✅ Full | Full compatibility |
| GET /metrics | ✅ Full | Prometheus format |

### Anthropic API Compatibility

| Feature | Status | Notes |
|---------|--------|-------|
| Messages API | ✅ Full | Via adapter |
| Streaming | ✅ Full | Via adapter |
| Tool Use | ✅ Full | Via adapter |

### Google API Compatibility

| Feature | Status | Notes |
|---------|--------|-------|
| Generative AI | ✅ Full | Via adapter |
| Streaming | ✅ Full | Via adapter |
| Function Calling | ✅ Full | Via adapter |

---

## Plugin System Compatibility

| Plugin Type | Status | Notes |
|-------------|--------|-------|
| Provider Plugins | ✅ Full | Full support |
| Tool Plugins | ✅ Full | Full support |
| Extension Plugins | ⚠️ Partial | Basic support |

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Request Latency | ~100-500ms | Depends on provider |
| Streaming Start | ~200ms | First chunk latency |
| Memory Usage | ~50-100MB | Base memory |
| CPU Usage | Low | Idle state |
| Max Concurrent | 16 | Default concurrency |

---

## Security Features

| Feature | Status | Notes |
|---------|--------|-------|
| Rate Limiting | ✅ Full | Configurable limits |
| Permission System | ✅ Full | Scope-based |
| Audit Logging | ✅ Full | All operations logged |
| Input Validation | ✅ Full | All inputs validated |
| CORS Support | ✅ Full | Configurable origins |

---

## Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Browser automation speed | Medium | Expected for browser-based |
| Manual login required | Low | Use session persistence |
| No WebSocket in all providers | Low | Use SSE streaming |
| Tool calling via negotiation | Medium | Direct API preferred |

---

## Upgrade Path

| From | To | Breaking Changes |
|------|-----|------------------|
| 0.x | 1.0 | None (backward compatible) |
| 1.0 | 1.x | None (backward compatible) |
