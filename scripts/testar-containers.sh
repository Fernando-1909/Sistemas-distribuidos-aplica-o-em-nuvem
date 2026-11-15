#!/usr/bin/env bash
# Teste documentado do Módulo 3: os dados persistem após "docker compose down" e "up"?
# Uso (na raiz do projeto):  bash scripts/testar-containers.sh
# Requer Docker com Compose v2. Não apaga os volumes no final (use --limpar para apagar).
set -euo pipefail

TASKS="http://localhost:8000/api"
USERS="http://localhost:8001/api"
PROJECTS="http://localhost:8002/api"
JSON='Content-Type: application/json'
CURL="curl -sS --max-time 30"
TITULO="Persistência $(date +%H%M%S)"

get_id() { sed -E 's/.*"id": ?([0-9]+).*/\1/'; }

echo "==> 1. Subindo tudo (docker compose up --build --wait)"
docker compose up --build -d --wait
docker compose ps
echo

echo "==> 2. Health check dos 3 serviços"
$CURL "$USERS/health/"; echo
$CURL "$PROJECTS/health/"; echo
$CURL "$TASKS/health/?deep=1"; echo; echo

echo "==> 3. Criando dados: responsável, projeto e tarefa (cada um vai para o banco do seu serviço)"
MID=$($CURL -X POST "$USERS/members/" -H "$JSON" -d '{"name":"Ana (teste Docker)"}' | get_id)
PID=$($CURL -X POST "$PROJECTS/projects/" -H "$JSON" -d '{"name":"Projeto (teste Docker)","color":"#d93e72"}' | get_id)
$CURL -X POST "$TASKS/tasks/" -H "$JSON" \
  -d "{\"title\":\"$TITULO\",\"responsible_id\":$MID,\"project_id\":$PID}" > /dev/null
echo "Criados: responsável $MID, projeto $PID e a tarefa \"$TITULO\""
echo
echo "Tarefas ANTES do down:"
$CURL "$TASKS/tasks/"; echo; echo

echo "==> 4. Derrubando os containers (docker compose down) - os volumes são mantidos"
docker compose down
echo "Containers em execução agora:"
docker compose ps
echo "Volumes que continuam existindo:"
docker volume ls --filter name=tarefas_
echo

echo "==> 5. Subindo de novo (docker compose up --wait)"
docker compose up -d --wait
echo

echo "==> 6. Tarefas DEPOIS do down/up (os nomes do responsável e do projeto vêm dos outros serviços)"
RESULTADO=$($CURL "$TASKS/tasks/")
echo "$RESULTADO"; echo
if echo "$RESULTADO" | grep -q "$TITULO" && echo "$RESULTADO" | grep -q "Ana (teste Docker)" && echo "$RESULTADO" | grep -q "Projeto (teste Docker)"; then
  echo "OK: os dados dos 3 bancos persistiram após docker compose down/up."
else
  echo "FALHA: os dados não foram encontrados após o down/up." >&2
  exit 1
fi

if [ "${1:-}" = "--limpar" ]; then
  echo; echo "==> 7. Limpando (docker compose down -v apaga os volumes)"
  docker compose down -v
else
  echo; echo "Os containers continuam no ar. Para parar mantendo os dados: docker compose down"
  echo "Para parar e APAGAR todos os dados: docker compose down -v"
fi
