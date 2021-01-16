#!/bin/sh -e
# Build and publish storybook.

source ./prepare.sh
rm -rf storybook-static
yarn storybook:build
