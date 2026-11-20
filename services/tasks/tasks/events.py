"""Produtor de eventos (Módulo 4 — mensageria com RabbitMQ).

Evento publicado: "tarefa concluída".

    tasks-service (produtor) --> exchange "tarefas.eventos" (topic)
                                   routing key "tarefa.concluida"
                                   --> fila "notificacoes.tarefa-concluida" --> notifications (consumidor)

Decisões:
- A exchange é do tipo *topic* e durável; a mensagem é *persistente* (sobrevive a um
  reinício do RabbitMQ, desde que a fila também seja durável).
- O produtor NÃO conhece o consumidor: só publica na exchange. Quem cria a fila e a
  liga à exchange é o consumidor. Assim, novos consumidores podem ser adicionados
  sem alterar o tasks-service.
- Publicar NUNCA derruba a API: se o RabbitMQ estiver fora do ar, a falha é registrada
  no log e a requisição segue normalmente (a tarefa já foi concluída no banco).
"""
import json
import logging
import uuid
from datetime import datetime, timezone

import pika
from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = "tarefas.eventos"
ROUTING_KEY_COMPLETED = "tarefa.concluida"


def _parameters() -> pika.URLParameters:
    params = pika.URLParameters(settings.RABBITMQ_URL)
    params.socket_timeout = settings.RABBITMQ_TIMEOUT
    params.blocked_connection_timeout = settings.RABBITMQ_TIMEOUT
    params.connection_attempts = 1
    return params


def build_completed_event(task) -> dict:
    completed_at = task.completed_at or datetime.now(timezone.utc)
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": "task.completed",
        "occurred_at": completed_at.isoformat(),
        "source": "tasks-service",
        "task": {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "priority": task.priority,
            "responsible_id": task.responsible_id,
            "project_id": task.project_id,
            "completed_at": completed_at.isoformat(),
        },
    }


def publish_task_completed(task) -> bool:
    """Publica o evento "tarefa concluída". Devolve True se foi publicado. Nunca levanta exceção."""
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL não definida: evento da tarefa %s não foi publicado.", task.id)
        return False

    event = build_completed_event(task)
    try:
        connection = pika.BlockingConnection(_parameters())
        try:
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
            channel.basic_publish(
                exchange=EXCHANGE,
                routing_key=ROUTING_KEY_COMPLETED,
                body=json.dumps(event, ensure_ascii=False).encode("utf-8"),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    content_encoding="utf-8",
                    delivery_mode=pika.DeliveryMode.Persistent,
                    message_id=event["event_id"],
                    type=event["event_type"],
                ),
            )
        finally:
            connection.close()
    except Exception:  # broker fora do ar, timeout, credenciais erradas...
        logger.warning("Falha ao publicar o evento da tarefa %s no RabbitMQ.", task.id, exc_info=True)
        return False

    logger.info(
        "Evento publicado: %s (tarefa %s) em %s / %s",
        event["event_id"], task.id, EXCHANGE, ROUTING_KEY_COMPLETED,
    )
    return True


def ping() -> str:
    """Estado do RabbitMQ para o health check detalhado: ok, unavailable ou disabled."""
    if not settings.RABBITMQ_URL:
        return "disabled"
    try:
        pika.BlockingConnection(_parameters()).close()
        return "ok"
    except Exception:
        return "unavailable"
