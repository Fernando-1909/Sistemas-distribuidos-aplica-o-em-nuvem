#!/usr/bin/env bash
# Teste documentado da comunicação entre os microsserviços (HTTP síncrono).
# Uso:  bash scripts/testar-microsservicos.sh TASKS_URL USERS_URL PROJECTS_URL
#   ex: bash scripts/testar-microsservicos.sh https://tarefas-api.onrender.com \
#          https://tarefas-users.onrender.com https://tarefas-projects.onrender.com
# Sem argumentos usa os serviços locais (portas 8000, 8001 e 8002).
set -euo pipefail

TASKS="${1:-http://localhost:8000}";    TASKS="${TASKS%/}/api"
USERS="${2:-http://localhost:8001}";    USERS="${USERS%/}/api"
PROJECTS="${3:-http://localhost:8002}"; PROJECTS="${PROJECTS%/}/api"
JSON='Content-Type: application/json'
CURL="curl -sS --max-time 90"

get_id() { sed -E 's/.*"id": ?([0-9]+).*/\1/'; }

echo "==> 0. Health check de cada serviço (cada um com o seu banco)"
$CURL "$USERS/health/";    echo
$CURL "$PROJECTS/health/"; echo
$CURL "$TASKS/health/?deep=1"; echo; echo

echo "==> 1. users-service: criar responsável (POST /members/)"
M=$($CURL -X POST "$USERS/members/" -H "$JSON" -d '{"name":"Ana Souza","email":"ana@exemplo.com"}')
echo "$M"; MID=$(echo "$M" | get_id); echo

echo "==> 2. projects-service: criar projeto (POST /projects/)"
P=$($CURL -X POST "$PROJECTS/projects/" -H "$JSON" -d '{"name":"Trabalho de SD","color":"#d93e72"}')
echo "$P"; PID=$(echo "$P" | get_id); echo

echo "==> 3. tasks-service: criar tarefa referenciando os dois (ele valida os ids via HTTP)"
T=$($CURL -X POST "$TASKS/tasks/" -H "$JSON" \
  -d "{\"title\":\"Entregar o Módulo 2\",\"responsible_id\":$MID,\"project_id\":$PID,\"priority\":1}")
echo "$T"; TID=$(echo "$T" | get_id); echo

echo "==> 4. tasks-service: listar (a resposta traz o NOME vindo dos outros serviços)"
$CURL "$TASKS/tasks/"; echo; echo

echo "==> 5. Validação entre serviços: responsável inexistente deve retornar 400"
$CURL -w "\nHTTP %{http_code}\n" -X POST "$TASKS/tasks/" -H "$JSON" \
  -d '{"title":"Teste","responsible_id":999999}'; echo

echo "==> 6. Filtrar tarefas por projeto (GET /tasks/?project_id=$PID)"
$CURL "$TASKS/tasks/?project_id=$PID"; echo; echo

echo "==> 7. Limpeza (DELETE nos três serviços)"
for url in "$TASKS/tasks/$TID/" "$PROJECTS/projects/$PID/" "$USERS/members/$MID/"; do
  $CURL -o /dev/null -w "$url -> HTTP %{http_code}\n" -X DELETE "$url"
done

cat <<'MSG'

Teste de falha (manual): suspenda o users-service (no Render: Settings > Suspend Service,
ou pare o processo local) e repita os passos 3 e 4:
  - listar tarefas continua funcionando, com "responsible": {"name": null, "state": "unavailable"};
  - criar tarefa com responsible_id responde HTTP 503 com mensagem amigável.
MSG
