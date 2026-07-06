#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== BigQuery Release Notes Tracker ==="

# Check if virtualenv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

echo "Installing/checking dependencies..."
pip install -r requirements.txt

echo "Starting Flask Server on http://localhost:5001 ..."
python3 app.py
