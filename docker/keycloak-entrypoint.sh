#!/bin/sh
set -e

if [ -z "$EXTERNAL_ORIGIN" ]; then
  if [ -n "$EXTERNAL_HOSTPORT" ]; then
    EXTERNAL_ORIGIN="${EXTERNAL_PROTOCOL:-http}://${EXTERNAL_HOSTPORT}"
  fi
fi

if [ -z "$KC_HOSTNAME" ]; then
  if [ -n "$EXTERNAL_ORIGIN" ]; then
    export KC_HOSTNAME="${EXTERNAL_ORIGIN}/auth"
  fi
fi

mkdir -p /opt/keycloak/data/import
sed /etc/keycloak/realm.json \
  -e 's,{EXTERNAL_ORIGIN},'"$EXTERNAL_ORIGIN"',g' \
  -e 's,{ADMIN_EMAIL},'"$ADMIN_EMAIL"',g' \
  > /opt/keycloak/data/import/realm.json

exec /opt/keycloak/bin/kc.sh "$@"
