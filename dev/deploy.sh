#!/usr/bin/env bash

set -e

usage() {
  echo "Usage: $0 server_name deployment_name" >&2
  exit 1
}

server_name="$1"
shift || usage

deployment_name="$1"
shift || usage

set -x

rsync -ravlL --delete FunDB/publish/ "$server_name:$deployment_name/FunDB"
rsync -ravlL --delete FunApp/dist/ "$server_name:$deployment_name/FunApp"

ssh "$server_name" -- nixops deploy --network "\$(readlink -f $deployment_name/machines)"
