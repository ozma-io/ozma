#!/bin/sh -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
  CREATE USER keycloak WITH PASSWORD 'keycloak';
  CREATE DATABASE keycloak OWNER keycloak;
  \c keycloak
  ALTER SCHEMA public OWNER TO keycloak;

  CREATE USER ozmadb WITH PASSWORD 'ozmadb';
  CREATE DATABASE ozmadb OWNER ozmadb;
  \c ozmadb
  ALTER SCHEMA public OWNER TO ozmadb;
EOSQL
