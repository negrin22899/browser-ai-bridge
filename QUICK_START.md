# Quick Start - Browser AI Bridge

## 3 Steps to Start 🚀

### 1. Install (2 min)

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

### 2. Sign in (1 min)

Open Chrome and go to ONE of:
- https://gemini.google.com (recommended)
- https://chatgpt.com
- https://claude.ai
- https://chat.deepseek.com

Sign in with your account.

### 3. Start (1 min)

```bash
node apps/cli/dist/index.js serve --site gemini
```

Done! Server running at http://localhost:3000

---

## Use in Your IDE

Add this to your AI extension settings:
- **API URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini`

---

## Quick Commands

```bash
# Start server
node apps/cli/dist/index.js serve --site gemini

# Quick chat
node apps/cli/dist/index.js chat "Hello!"

# Check system
node apps/cli/dist/index.js doctor
```

---

## That's it! 

You're ready to use AI in your code editor. 🎉

Need more? See [USER_GUIDE.md](./USER_GUIDE.md)
