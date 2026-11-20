"""Consumidor de eventos (Módulo 4 — mensageria com RabbitMQ).

Serviço simples: recebe o evento "tarefa concluída", CONFIRMA o recebimento (ack) e
registra uma linha no log. Não tem banco nem API HTTP.

    exchange "tarefas.eventos" --(routing key "tarefa.concluida")--> fila "notificacoes.tarefa-concluida"

Decisões:
- Quem cria a fila e a liga à exchange é o consumidor (o produtor só publica).
- Fila durável + mensagens persistentes: se o consumidor ficar fora do ar, as mensagens
  esperam na fila e são entregues quando ele voltar.
- Confirmação manual (ack) DEPOIS de processar: se o consumidor cair no meio do
  processamento, o RabbitMQ reentrega a mensagem (entrega "pelo menos uma vez").
- prefetch=1: uma mensagem por vez.
- Se o RabbitMQ cair, o consumidor tenta reconectar sozinho.
"""
import json
import logging
import os
import signal
import sys
import time

import pika
from pika.exceptions import AMQPChannelError, AMQPConnectionError

EXCHANGE = os.environ.get("RABBITMQ_EXCHANGE", "tarefas.eventos")
QUEUE = os.environ.get("RABBITMQ_QUEUE", "notificacoes.tarefa-concluida")
ROUTING_KEY = os.environ.get("RABBITMQ_ROUTING_KEY", "tarefa.concluida")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F")
RETRY_SECONDS = float(os.environ.get("RETRY_SECONDS", "3"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [notifications] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("notifications")


def on_message(channel, method, properties, body):
    """Chamada para cada mensagem recebida."""
    try:
        event = json.loads(body)
        task = event["task"]
    except (ValueError, KeyError, TypeError) as exc:
        log.error("Mensagem inválida descartada (%s): %r", exc, body[:200])
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    log.info(
        'EVENTO RECEBIDO: %s | tarefa #%s "%s" concluída | responsible_id=%s project_id=%s | event_id=%s',
        event.get("event_type"),
        task.get("id"),
        task.get("title"),
        task.get("responsible_id"),
        task.get("project_id"),
        event.get("event_id"),
    )
    # Confirma o recebimento: só agora o RabbitMQ remove a mensagem da fila.
    channel.basic_ack(delivery_tag=method.delivery_tag)


def consume_forever():
    while True:
        try:
            log.info("Conectando ao RabbitMQ...")
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
            channel.queue_declare(queue=QUEUE, durable=True)
            channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=ROUTING_KEY)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE, on_message_callback=on_message)
            log.info(
                "Aguardando eventos na fila '%s' (exchange '%s', routing key '%s')...",
                QUEUE, EXCHANGE, ROUTING_KEY,
            )
            channel.start_consuming()
        except (AMQPConnectionError, AMQPChannelError, ConnectionError) as exc:
            log.warning("RabbitMQ indisponível (%s). Nova tentativa em %.0fs.", exc.__class__.__name__, RETRY_SECONDS)
            time.sleep(RETRY_SECONDS)


def main():
    # O Docker envia SIGTERM ao parar o container: encerra de forma limpa.
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    try:
        consume_forever()
    except KeyboardInterrupt:
        log.info("Encerrando.")


if __name__ == "__main__":
    main()
