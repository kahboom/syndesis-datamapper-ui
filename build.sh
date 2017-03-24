#!/bin/bash

echo "Building code"
npm run aot:build

echo "Rolling up code"
npm run aot:rollup

echo "Copying distribution files"
node copy-dist-files

echo "Starting server"
npm run aot:serve