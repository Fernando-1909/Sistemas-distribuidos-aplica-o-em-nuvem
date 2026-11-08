# Changelog

## [Módulo 2] — Serviços / Microsserviços · tag `entrega-2-microsservicos`
- O backend único foi decomposto em **3 microsserviços Django**, cada um com seu próprio banco PostgreSQL (Neon):
  - `services/tasks` — tarefas (o antigo `backend/`);
  - `services/users` — responsáveis (novo);
  - `services/projects` — projetos (novo).
- Comunicação **HTTP síncrona**: o tasks-service valida (na escrita) e enriquece (na leitura) as tarefas consultando users e projects, em paralelo e com consulta em lote (`?ids=1,2,3`).
- **Tolerância a falhas:** timeout nas chamadas; na leitura a tarefa volta com o nome "indisponível"; na escrita responde 503 com mensagem amigável. Editar o título ou concluir uma tarefa não depende dos outros serviços.
- A tarefa agora guarda `responsible_id` e `project_id` no lugar do campo `responsible` (texto). Migration `0003`: **o nome do responsável das tarefas antigas é descartado**.
- Frontend com Projetos e Responsáveis (criar e excluir pela barra lateral), filtros por projeto e responsável, avisos quando um serviço está fora do ar.
- Novas variáveis de ambiente: `USERS_SERVICE_URL`, `PROJECTS_SERVICE_URL`, `SERVICE_TIMEOUT` (tasks) e `TASKS_API_URL`, `USERS_API_URL`, `PROJECTS_API_URL` (frontend).
- Diagrama da arquitetura em `docs/arquitetura.svg` e `docs/arquitetura.png`.
- Script `scripts/testar-microsservicos.sh` (teste documentado da comunicação entre serviços).
- `render.yaml` atualizado para os 4 serviços.

## [Módulo 1] — Computação em Nuvem · tag `entrega-1-cloud`
- API REST de tarefas (Django + Django REST Framework) com CRUD completo.
- Banco PostgreSQL hospedado no Neon (free tier), configurado por `DATABASE_URL` (funciona com qualquer PostgreSQL).
- Backend publicado no Render (Web Service gratuito) com variáveis de ambiente configuradas no painel.
- Frontend Angular (visões Hoje/Em breve, prioridades, datas, lista e quadro, tema escuro e claro) publicado como Static Site no Render.
- Campos `priority` e `due_date` na tarefa (migration `0002`).
- Endpoint `/api/health/` para health check e teste de conexão com o banco.
- Script `scripts/testar-api.sh` com o teste documentado (curl).

## Próximos módulos
- **Módulo 3** — Dockerfiles + `docker-compose.yml`.
- **Módulo 4** — RabbitMQ: evento "tarefa concluída" (já existe o campo `completed_at`).
