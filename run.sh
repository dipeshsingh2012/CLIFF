#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "      🚀 Launching CLIFF: Career Intelligence System      "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Start FastAPI Backend
echo "1️⃣ Starting FastAPI Backend on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
fi
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start React Frontend
echo "2️⃣ Starting Vite React Frontend on http://localhost:5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

trap "echo 'Stopping CLIFF services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" SIGINT SIGTERM EXIT

echo ""
echo "✅ CLIFF is running!"
echo "   • React Dashboard: http://localhost:5173"
echo "   • FastAPI API Docs: http://localhost:8000/docs"
echo "   • Chrome Extension: Load '$SCRIPT_DIR/extension' in chrome://extensions (Developer Mode)"
echo ""
echo "Press Ctrl+C to terminate both servers."

wait

