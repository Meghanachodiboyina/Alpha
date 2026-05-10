#!/bin/bash

# Start Backend
echo "Starting Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Both services are starting..."
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: Check the output above for the Vite URL (usually http://localhost:5173)"

# Handle termination
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
