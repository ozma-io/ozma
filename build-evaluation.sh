#!/bin/sh -e
# Build and publish the application.

set -x

test -f yarn.lock
rm -rf dist dist-evaluation
yarn
CONFIG=evaluation yarn build
mv dist dist-evaluation
