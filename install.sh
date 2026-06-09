#!/bin/bash

#Exit immediately if a command exits with a non-zero status
set -e

echo "Installing FarmDog dependencies and running the application..."

# Create the virtual environment named FarmDog
python3 -m venv FarmDog

# Activate environment
source FarmDog/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "requirements.txt not found, skipping dependency installation."
fi

# Make startup script executable
chmod +x startserver.sh

#Run the Python file
python "FarmDog.py"

read
