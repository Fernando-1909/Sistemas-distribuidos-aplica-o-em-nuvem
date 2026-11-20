# ---------------------------------------------------------------------------
# Estágio 1 (builder): instala as dependências em um virtualenv.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /build
COPY requirements.txt .
RUN pip install -r requirements.txt

# ---------------------------------------------------------------------------
# Estágio 2 (runtime): imagem final, enxuta, sem privilégios de root.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN groupadd --system app \
 && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

# /app precisa pertencer ao usuário "app" (o WORKDIR criaria o diretório como root).
RUN mkdir -p /app && chown app:app /app
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app consumer.py .

USER app

# Sem API HTTP, então não há HEALTHCHECK de HTTP: o consumidor reconecta sozinho se o RabbitMQ cair.
CMD ["python", "consumer.py"]
