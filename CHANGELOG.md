# Changelog

## [Módulo 1] — Computação em Nuvem · tag `entrega-1-cloud`
- API REST de tarefas (Django + Django REST Framework) com CRUD completo.
- Banco PostgreSQL hospedado no Neon (free tier), configurado por `DATABASE_URL` (funciona com qualquer PostgreSQL).
- Backend publicado no Render (Web Service gratuito) com variáveis de ambiente configuradas no painel.
- Frontend Angular (tema escuro, tons de roxo e rosa) publicado como Static Site no Render.
- Endpoint `/api/health/` para health check e teste de conexão com o banco.
- Script `scripts/testar-api.sh` com o teste documentado (curl).

## Próximos módulos
- **Módulo 2** — decomposição em 3+ microsserviços (tarefas, responsáveis, ...).
- **Módulo 3** — Dockerfiles + `docker-compose.yml`.
- **Módulo 4** — RabbitMQ: evento "tarefa concluída" (já existe o campo `completed_at`).
