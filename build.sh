#!/bin/sh -e
# Build and publish the application.

. ./prepare.sh
rm -rf dist
yarn build
