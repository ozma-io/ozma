#!/usr/bin/env bash
# Build and publish the application.

. ./prepare.sh
rm -rf dist
yarn build
