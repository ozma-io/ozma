#!/usr/bin/env bash

set -ex

test -f yarn.lock
pushd 3rdparty/ozma-api
yarn
./build.sh
yarn link
popd
yarn link ozma-api
yarn
