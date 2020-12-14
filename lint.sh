#!/bin/sh -e
# Lint the application.

set -x

test -f yarn.lock
yarn
yarn lint --no-fix --max-warnings 0
# yarn lint:style doesn't return proper exit code when max-warnings is exceeded.
npx stylelint --no-fix --max-warnings 0 src/
