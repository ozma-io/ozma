#!/usr/bin/env bash
# Build and publish the application.

set -ex

. ./prepare.sh
rm -rf dist
yarn build
