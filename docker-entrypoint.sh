#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  : "${DATABASE_HOST:?DATABASE_HOST no está configurada}"
  : "${DATABASE_PORT:=5432}"
  : "${DATABASE_USER:?DATABASE_USER no está configurada}"
  : "${DATABASE_NAME:?DATABASE_NAME no está configurada}"
  : "${DATABASE_PASSWORD_FILE:?DATABASE_PASSWORD_FILE no está configurada}"

  DATABASE_PASSWORD="$(cat "$DATABASE_PASSWORD_FILE")"
  export DATABASE_PASSWORD
  DATABASE_URL="$(node -e '
    const url = new URL("postgresql://localhost");
    url.hostname = process.env.DATABASE_HOST;
    url.port = process.env.DATABASE_PORT;
    url.username = process.env.DATABASE_USER;
    url.password = process.env.DATABASE_PASSWORD;
    url.pathname = `/${process.env.DATABASE_NAME}`;
    url.searchParams.set("schema", "public");
    process.stdout.write(url.toString());
  ')"
  export DATABASE_URL
  unset DATABASE_PASSWORD
fi

exec "$@"
