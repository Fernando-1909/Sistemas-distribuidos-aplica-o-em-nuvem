#!/usr/bin/env bash
# Teste documentado do Módulo 4: o evento "tarefa concluída" é publicado no RabbitMQ
# pelo tasks-service (produtor) e consumido pelo serviço notifications (consumidor).
# Uso (na raiz do projeto):  bash scripts/testar-mensageria.sh        (não apaga os dados no final)
#                            bash scripts/testar-mensageria.sh --limpar
set -euo pipefail

TASKS="http://localhost:8000/api"
FILA="notificacoes.tarefa-concluida"
JSON='Content-Type: application/json'
CURL="curl -sS --max-time 30"
SUFIXO="$(date +%H%M%S)"

get_id() { sed -E 's/^\{"id": ?([0-9]+).*/\1/'; }

fila() {  # estado da fila em TEMPO REAL (rabbitmqctl); a API do painel atualiza só a cada ~5 s
  docker compose exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers 2>/dev/null \
    | awk -v q="$FILA" '$1 == q { printf "fila %s: mensagens_esperando=%s mensagens_sem_confirmacao=%s consumidores=%s", $1, $2, $3, $4 }'
  echo
}

espera_log() {  # espera (até 30 s) o consumidor registrar o evento da tarefa $1
  for _ in $(seq 1 30); do
    if docker compose logs --no-log-prefix notifications 2>/dev/null | grep -q "EVENTO RECEBIDO.*\"$1\""; then return 0; fi
    sleep 1
  done
  return 1
}

concluir() {  # cria uma tarefa e a marca como concluída (publica o evento); imprime o id
  local id
  id=$($CURL -X POST "$TASKS/tasks/" -H "$JSON" -d "{\"title\":\"$1\"}" | get_id)
  $CURL -o /dev/null -w "PATCH /api/tasks/$id/ {\"status\":\"done\"} -> HTTP %{http_code}\n" \
    -X PATCH "$TASKS/tasks/$id/" -H "$JSON" -d '{"status":"done"}' >&2
  echo "$id"
}

echo "==> 1. Subindo tudo (docker compose up --build --wait)"
docker compose up --build -d --wait
docker compose ps --format "table {{.Service}}\t{{.Status}}"
echo
echo "Painel do RabbitMQ: http://localhost:15672  (usuário: tarefas / senha: ${RABBITMQ_PASSWORD:-tarefas_dev})"
echo

echo "==> 2. Health check do produtor (mostra o estado do RabbitMQ)"
$CURL "$TASKS/health/?deep=1"; echo; echo

echo "==> 3. Fluxo básico: concluir uma tarefa publica o evento e o consumidor o recebe"
T1="Tarefa concluída $SUFIXO"
concluir "$T1" > /dev/null
if espera_log "$T1"; then
  echo "Log do consumidor (notifications):"
  docker compose logs --no-log-prefix notifications | grep "EVENTO RECEBIDO.*$T1"
else
  echo "FALHA: o consumidor não registrou o evento." >&2; exit 1
fi
echo "$(fila)"
echo

echo "==> 4. Desacoplamento: com o consumidor PARADO, a API continua funcionando e as mensagens esperam na fila"
docker compose stop notifications
T2="Concluída com consumidor parado $SUFIXO"
concluir "$T2" > /dev/null
sleep 2
echo "$(fila)   <- a mensagem espera na fila, sem consumidor"
echo

echo "==> 5. Religando o consumidor: ele recebe a mensagem que ficou esperando"
docker compose start notifications
if espera_log "$T2"; then
  docker compose logs --no-log-prefix notifications | grep "EVENTO RECEBIDO.*$T2"
else
  echo "FALHA: a mensagem da fila não foi consumida." >&2; exit 1
fi
sleep 1
echo "$(fila)"
echo
echo "OK: produtor -> RabbitMQ -> consumidor funcionando (inclusive com o consumidor parado)."

if [ "${1:-}" = "--limpar" ]; then
  echo; echo "==> Limpando (docker compose down -v apaga os volumes)"
  docker compose down -v
else
  echo; echo "Os containers continuam no ar. Para parar mantendo os dados: docker compose down"
fi
