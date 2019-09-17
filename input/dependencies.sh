#!/bin/bash

PROJECT_DIR="./node_modules"
NODE_MODULES_DIR="../node_modules"
if [ -d "$PROJECT_DIR" ]; then
    echo "Nothing to do"
else
    if [ -d "$NODE_MODULES_DIR" ]; then
        echo "Creating a symbolic link"
        ln -s ../node_modules ./node_modules
    else
        echo "npm install and creating a symbolic link"
        npm install
        mv ./node_modules ../node_modules
        ln -s ../node_modules ./node_modules
    fi
fi

echo "Running gulp default"

gulp default
