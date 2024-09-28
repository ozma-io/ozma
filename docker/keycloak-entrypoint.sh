#!/bin/sh
set -e

mkdir -p /opt/keycloak/data/import
sed /etc/keycloak/realm.json \
  -e 's,{OZMA_REPORT_GENERATOR_CLIENT_SECRET},'"$OZMA_REPORT_GENERATOR_CLIENT_SECRET"',g' \
  > /opt/keycloak/data/import/realm.json

exec /opt/keycloak/bin/kc.sh "$@"
