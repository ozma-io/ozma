#!/bin/sh -e
# Lint the application.

set -x

test -f yarn.lock
yarn lint --no-fix
npx stylelint --no-fix --max-warnings 0 src/
