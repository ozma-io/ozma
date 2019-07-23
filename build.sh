#!/bin/sh -e
# Build and publish the application.

set -x

rm -rf dist
npm install
npm run build
rm dist/static/js/*.map
