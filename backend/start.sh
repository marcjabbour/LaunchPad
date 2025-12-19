#!/bin/bash

# LaunchPad Backend Startup Script

echo "Starting LaunchPad Backend Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env and add your Google API key"
    exit 1
fi

# Start the server
echo "Starting FastAPI server..."
python main.py