#!/bin/bash

PROJECT_DIR="./node_modules"
NODE_MODULES_DIR="../../node_modules"
if [ -d "$PROJECT_DIR" ]; then
    echo "Nothing to do"
else
    if [ -d "$NODE_MODULES_DIR" ]; then
        echo "Creating a symbolic link"
        ln -s $NODE_MODULES_DIR $PROJECT_DIR
    else
        echo "npm install and creating a symbolic link"
        npm install
        mv $PROJECT_DIR $NODE_MODULES_DIR
        ln -s $NODE_MODULES_DIR $PROJECT_DIR
    fi
fi

echo "Running gulp default"

gulp default

# Remove node_modules link in project (bug with pure::variants in mac when right click on elements in xfm, vdm, ccfm files)
rm $PROJECT_DIR
