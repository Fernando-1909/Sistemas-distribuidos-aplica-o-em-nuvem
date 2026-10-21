#!/usr/bin/env bash
# Teste documentado da API (CRUD completo) com curl.
# Uso:  ./scripts/testar-api.sh https://SEU-BACKEND.onrender.com
#       ./scripts/testar-api.sh            (usa http://localhost:8000)
set -euo pipefail

BASE="${1:-http://localhost:8000}"
BASE="${BASE%/}/api"
JSON='Content-Type: application/json'

# Extrai o campo "id" do JSON sem depender de jq
get_id() { sed -E 's/.*"id": ?([0-9]+).*/\1/'; }

echo "==> 0. Health check (API + conexao com o banco)"
curl -sS --max-time 90 "$BASE/health/"; echo; echo

echo "==> 1. CRIAR tarefa (POST /tasks/)"
CREATED=$(curl -sS --max-time 90 -X POST "$BASE/tasks/" -H "$JSON" \
  -d '{"title":"Publicar API no Render","description":"Modulo 1","responsible":"Equipe"}')
echo "$CREATED"; ID=$(echo "$CREATED" | get_id); echo

echo "==> 2. LISTAR tarefas (GET /tasks/)"
curl -sS "$BASE/tasks/"; echo; echo

echo "==> 3. ATUALIZAR tarefa $ID para 'done' (PATCH /tasks/$ID/)"
curl -sS -X PATCH "$BASE/tasks/$ID/" -H "$JSON" -d '{"status":"done"}'; echo; echo

echo "==> 4. FILTRAR por status (GET /tasks/?status=done)"
curl -sS "$BASE/tasks/?status=done"; echo; echo

echo "==> 5. DELETAR tarefa $ID (DELETE /tasks/$ID/)"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X DELETE "$BASE/tasks/$ID/"; echo

echo "==> 6. Validacao: titulo vazio deve retornar 400"
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/tasks/" -H "$JSON" -d '{"title":""}'
