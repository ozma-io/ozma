#!/bin/sh
# Build and publish the application.

rm -rf dist
npm install
npm run build
