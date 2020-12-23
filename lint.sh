#!/bin/sh -e
# Lint the application.

set -x

test -f yarn.lock
yarn
yarn lint --no-fix --max-warnings 0
yarn lint:style --no-fix --max-warnings 0
