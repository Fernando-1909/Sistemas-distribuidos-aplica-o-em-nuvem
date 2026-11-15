# ---------------------------------------------------------------------------
# Estágio 1 (build): compila o Angular. Este estágio tem Node e centenas de MB
# de node_modules, mas NADA disso vai para a imagem final.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependências primeiro (cache de camadas)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# As URLs das APIs são gravadas no código durante o build (ver scripts/set-env.js).
# Para apontar para outros endereços: docker compose build --build-arg TASKS_API_URL=...
ARG TASKS_API_URL=http://localhost:8000/api
ARG USERS_API_URL=http://localhost:8001/api
ARG PROJECTS_API_URL=http://localhost:8002/api
ENV TASKS_API_URL=$TASKS_API_URL \
    USERS_API_URL=$USERS_API_URL \
    PROJECTS_API_URL=$PROJECTS_API_URL
RUN npm run build

# ---------------------------------------------------------------------------
# Estágio 2 (runtime): só o nginx servindo os arquivos estáticos já compilados.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
