#!/bin/sh
# Executado quando o container inicia: aplica as migrações e sobe o servidor.
set -e

echo "[entrypoint] Aplicando migrações..."
python manage.py migrate --noinput

echo "[entrypoint] Iniciando o gunicorn na porta ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --access-logfile -
