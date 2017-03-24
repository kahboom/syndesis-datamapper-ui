#!/bin/bash

echo "Building code"
node_modules/.bin/ngc -p ./tsconfig-aot.json 

echo "Rolling up code"
node_modules/.bin/rollup -c rollup-config.js

echo "Copying distribution files"
node copy-dist-files

echo "Starting server"
npm run aot:serve