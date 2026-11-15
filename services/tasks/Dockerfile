# ---------------------------------------------------------------------------
# Estágio 1 (builder): instala as dependências em um virtualenv.
# Nada deste estágio vai para a imagem final, só o virtualenv pronto.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /build
# Copiar só o requirements.txt primeiro aproveita o cache de camadas do Docker:
# se o código mudar mas as dependências não, esta etapa não é refeita.
COPY requirements.txt .
RUN pip install -r requirements.txt

# ---------------------------------------------------------------------------
# Estágio 2 (runtime): imagem final, enxuta, executada sem privilégios de root.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# Usuário comum: se alguém invadir o processo, não tem acesso de root ao container.
RUN groupadd --system app \
 && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

# /app precisa pertencer ao usuário "app" (o WORKDIR criaria o diretório como root).
RUN mkdir -p /app && chown app:app /app
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app . .

# Os arquivos estáticos (admin e página da API) são coletados na construção da imagem.
# DEBUG=True aqui só evita exigir SECRET_KEY/DATABASE_URL durante o build.
RUN DEBUG=True python manage.py collectstatic --noinput

USER app
EXPOSE 8000

# O Docker marca o container como "healthy" quando a API responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health/' % os.environ.get('PORT', '8000'), timeout=4)"

# Aplica as migrações e sobe o gunicorn (ver entrypoint.sh).
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
