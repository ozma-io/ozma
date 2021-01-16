#!/bin/sh -e
# Build and publish storybook.

. ./prepare.sh
rm -rf storybook-static
yarn storybook:build
