#!/bin/sh
# Build and publish the application.

set -x

rm -rf dist
npm install
npm run build
