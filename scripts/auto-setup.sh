#!/bin/bash

echo "========================================"
echo "Browser AI Bridge - Auto Setup"
echo "========================================"
echo ""
echo "This will automatically set up everything you need."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}NOTE: Running as root. This is not recommended.${NC}"
    echo ""
fi

echo "[1/6] Checking system requirements..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js not found!${NC}"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo "After installing, run this script again."
    echo ""
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}[OK]${NC} Node.js $NODE_VERSION found"

# Check Chrome
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    if [ -d "/Applications/Google Chrome.app" ]; then
        echo -e "${GREEN}[OK]${NC} Chrome found"
    else
        echo -e "${YELLOW}[WARNING]${NC} Chrome not found"
        echo ""
        echo "Chrome is required for Browser AI Bridge to work."
        echo "Download from: https://www.google.com/chrome/"
        echo ""
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    # Linux
    if command -v google-chrome &> /dev/null || command -v google-chrome-stable &> /dev/null; then
        echo -e "${GREEN}[OK]${NC} Chrome found"
    else
        echo -e "${YELLOW}[WARNING]${NC} Chrome not found"
        echo ""
        echo "Chrome is required for Browser AI Bridge to work."
        echo "Install with: sudo apt install google-chrome-stable"
        echo ""
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo ""
echo "[2/6] Installing dependencies..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to install dependencies${NC}"
    echo ""
    echo "Try checking your internet connection."
    exit 1
fi

echo ""
echo "[3/6] Building project..."
echo ""
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to build project${NC}"
    exit 1
fi

echo ""
echo "[4/6] Verifying installation..."
echo ""
node apps/cli/dist/index.js doctor
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}WARNING: Some checks failed. The app may still work.${NC}"
fi

echo ""
echo "[5/6] Creating launcher script..."

# Create launcher script
cat > ~/browser-ai-bridge.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/browser-ai-bridge"
node apps/cli/dist/index.js serve --site gemini
EOF

chmod +x ~/browser-ai-bridge.sh

echo -e "${GREEN}[OK]${NC} Launcher script created at ~/browser-ai-bridge.sh"

echo ""
echo "[6/6] Setup complete!"
echo ""
echo "========================================"
echo "SETUP SUCCESSFUL!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Open Chrome and sign in to your AI:"
echo "   - Gemini: https://gemini.google.com"
echo "   - ChatGPT: https://chatgpt.com"
echo "   - Claude: https://claude.ai"
echo ""
echo "2. Start the server:"
echo "   - Run: ~/browser-ai-bridge.sh"
echo "   - OR: node apps/cli/dist/index.js serve --site gemini"
echo ""
echo "3. Configure your IDE:"
echo "   - API URL: http://localhost:3000/v1/chat/completions"
echo "   - Model: gemini"
echo ""
echo "For more help, see USER_GUIDE.md"
echo ""
