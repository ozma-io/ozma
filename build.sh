#!/bin/sh -e
# Build and publish the application.

source ./prepare.sh
rm -rf dist
yarn build
