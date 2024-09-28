#!/bin/sh
set -e

mkdir -p /opt/keycloak/data/import
sed /etc/keycloak/realm.json \
  -e 's,{EXTERNAL_ORIGIN},'"$EXTERNAL_ORIGIN"',g' \
  > /opt/keycloak/data/import/realm.json

exec /opt/keycloak/bin/kc.sh "$@"
