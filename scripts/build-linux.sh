#!/bin/bash

echo "========================================"
echo "Browser AI Bridge - Build Linux Installer"
echo "========================================"
echo ""

echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[2/4] Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build project"
    exit 1
fi

echo ""
echo "[3/4] Building desktop app..."
cd apps/desktop
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install desktop dependencies"
    exit 1
fi

echo ""
echo "[4/4] Creating Linux installer..."
npm run build:linux
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create installer"
    exit 1
fi

echo ""
echo "========================================"
echo "BUILD SUCCESSFUL!"
echo "========================================"
echo ""
echo "Installer location: apps/desktop/release/"
echo ""
ls -la release/*.AppImage release/*.deb 2>/dev/null || echo "No installer files found"
echo ""
