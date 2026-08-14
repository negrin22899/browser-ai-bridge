# User Guide - Browser AI Bridge

## Getting Started

### Step 1: Install

Download the installer for your platform from [GitHub Releases](https://github.com/negrin22899/browser-ai-bridge/releases/latest):

- **Windows**: Download `.exe` file, run it, follow the installer
- **macOS**: Download `.dmg` file, drag to Applications
- **Linux**: Download `.AppImage` file, make it executable, run it

### Step 2: Sign in to AI

Open Chrome and sign in to ONE of these services:

- [Gemini](https://gemini.google.com) (recommended)
- [ChatGPT](https://chatgpt.com)
- [Claude](https://claude.ai)
- [DeepSeek](https://chat.deepseek.com)

You need a free account. No API keys or paid subscriptions required.

### Step 3: Open Browser AI Bridge

Launch the app. You will see:

- **Title bar** with minimize/maximize/close buttons
- **Dashboard** showing server status
- **Sidebar** with navigation and server controls

The server starts automatically. If it doesn't, click the **Start** button in the sidebar.

### Step 4: Configure Your IDE

In your code editor (VS Code, Cursor, JetBrains, etc.), find the AI settings and enter:

- **API URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini` (or `chatgpt`, `claude`, `deepseek`)

Save the settings. Your IDE is now connected to Browser AI Bridge.

---

## Using the App

### Server Controls

- **Start/Stop**: Click the power button in the sidebar
- **Copy API URL**: Click the URL in the sidebar to copy it
- **Minimize to Tray**: Close the window — the app stays running in the system tray
- **Quit**: Right-click the tray icon and select "Quit"

### Title Bar

The custom title bar has:
- **Minimize**: Minimizes the window
- **Maximize**: Fullscreen/windowed toggle
- **Close**: Hides to system tray (does not quit)

### System Tray

When minimized to tray, right-click the icon for:
- Show Window
- Start/Stop Server
- Copy API URL
- Quit

### Auto-Updates

The app checks for updates automatically. When an update is available:
1. A dialog will appear asking if you want to update
2. Click "Update" to download
3. Click "Restart" to apply

---

## IDE Configuration

### VS Code (with Continue extension)

1. Install the "Continue" extension
2. Open settings (`Ctrl+,`)
3. Search for "Continue"
4. Set API Base URL: `http://localhost:3000`
5. Set Model: `gemini`

### Cursor

1. Open Settings (`Ctrl+,`)
2. Go to AI → API
3. Set API URL: `http://localhost:3000/v1/chat/completions`
4. Set Model: `gemini`

### JetBrains IDEs

1. Open Settings → Tools → AI Assistant
2. Select "Custom API endpoint"
3. Enter: `http://localhost:3000/v1/chat/completions`

---

## Troubleshooting

### "Chrome not found"

Install Google Chrome from https://www.google.com/chrome/

### "Not signed in"

1. Open Chrome
2. Go to gemini.google.com (or chatgpt.com, claude.ai)
3. Sign in with your account
4. Make sure you stay signed in

### "Connection refused"

1. Check if the server is running (green indicator in sidebar)
2. Click "Start" if it's red
3. Check if port 3000 is not used by another application

### "Rate limit exceeded"

Wait a minute and try again. This means the AI service is temporarily limiting requests.

### App won't start

1. Check if Chrome is installed
2. Restart the app
3. Check system tray — the app might be running there

---

## Features

- **No API keys**: Uses your browser session
- **Free**: If you have free access to the AI service
- **OpenAI compatible**: Works with any IDE that supports OpenAI API
- **Multiple AI**: Switch between Gemini, ChatGPT, Claude, DeepSeek
- **Secure**: Everything runs locally on your computer
- **Auto-updates**: Always up to date

---

## FAQ

**Q: Is it really free?**
A: Yes! You just need a free account on the AI service (Gemini, ChatGPT, etc.).

**Q: Do I need to keep Chrome open?**
A: Yes, Chrome needs to be running and signed in to the AI service.

**Q: Can I use multiple AI providers?**
A: Yes! Switch between them in the app or use different ports.

**Q: Is my data safe?**
A: Yes. Everything runs locally. No data is sent to third parties.

**Q: Does it work offline?**
A: No. You need internet to access the AI services.

---

## Links

- [GitHub](https://github.com/negrin22899/browser-ai-bridge)
- [Issues](https://github.com/negrin22899/browser-ai-bridge/issues)
- [Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)
