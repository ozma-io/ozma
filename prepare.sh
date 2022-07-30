#!/usr/bin/env bash

set -ex

test -f yarn.lock
pushd 3rdparty/ozma-api
yarn
yarn build
yarn link
popd
yarn link ozma-api
yarn
