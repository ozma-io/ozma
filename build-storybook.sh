#!/bin/sh -e
# Build and publish storybook.

set -x

test -f yarn.lock
rm -rf storybook-static
yarn
yarn storybook:build
