# Browser AI Bridge + OpenCode Demo

> Use browser AI (Gemini, ChatGPT, Claude) in your local development environment.

## What This Does

```
OpenCode → Browser AI Bridge → Gemini → Browser → Your Files → Response
```

Instead of copy-pasting between browser AI and your IDE, Browser AI Bridge connects them directly.

## Quick Demo

### 1. Start Browser AI Bridge

```bash
# Install
npm install
npm run build

# Start
node apps/cli/dist/index.js serve --site https://gemini.google.com
```

### 2. Configure OpenCode

Add to your OpenCode config:

```json
{
  "provider": {
    "api": "openai",
    "baseUrl": "http://localhost:3000/v1",
    "model": "gemini"
  }
}
```

### 3. Use It

Ask OpenCode to read a file:

```
> Read package.json and explain the dependencies
```

Browser AI Bridge will:
1. Send your message to Gemini (in browser)
2. Gemini asks to read the file
3. Runtime reads it (with permission)
4. Gemini explains the dependencies
5. Response comes back to OpenCode

## What You See

### In OpenCode
```
$ bab read package.json

Gemini: This project uses the following dependencies:
- hono: Fast web framework for the API server
- playwright-core: Browser automation for AI providers
- vitest: Testing framework
...
```

### In Browser AI Bridge Dashboard
```
Provider:    Gemini (Connected)
Session:     session-42
Tool:        fs.read (AUTO)
File:        package.json
Duration:    1.2s
```

### In Browser
Gemini is open, showing the conversation.

## Sample Project

See [sample-project/](./sample-project/) for a working example.

```bash
cd sample-project
npm install
npm start
```

## Features Demonstrated

- ✅ OpenAI-compatible API
- ✅ Browser AI integration (Gemini)
- ✅ File reading with permissions
- ✅ Real-time dashboard
- ✅ Audit logging

## Requirements

- Node.js >= 20
- Chrome browser
- Gemini account (logged in)

## Troubleshooting

Run the doctor command:

```bash
node apps/cli/dist/index.js doctor
```

This checks:
- Node.js version
- Playwright installation
- Chrome browser
- Browser profile
- Runtime status
- Git configuration

## More Examples

- [Chat Example](./chat.md)
- [Tool Example](./tools.md)
- [Plugin Example](../plugins/)
