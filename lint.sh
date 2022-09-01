#!/usr/bin/env bash
# Lint the application.

set -ex

. ./prepare.sh
yarn lint --no-fix --max-warnings 0
# Disable stylelint, as it often segfaults in CI.
# yarn lint:style --no-fix --max-warnings 0
