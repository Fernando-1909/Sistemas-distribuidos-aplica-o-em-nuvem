# Changelog

## [Módulo 3] — Containers · tag `entrega-3-containers`
- `Dockerfile` para cada microsserviço (`services/tasks`, `services/users`, `services/projects`): multi-stage (virtualenv no estágio `builder`), base `python:3.12-slim`, usuário sem privilégios, `HEALTHCHECK`, porta configurável por `$PORT` e `entrypoint.sh` que aplica as migrações antes de iniciar o gunicorn.
- `Dockerfile` do frontend: o Angular é compilado em um estágio com Node e só os arquivos compilados vão para uma imagem `nginx` (com `nginx.conf` de aplicação de página única e cache).
- `docker-compose.yml`: 7 containers (3 serviços, 3 PostgreSQL, 1 frontend), variáveis de ambiente, volumes nomeados (`users_data`, `projects_data`, `tasks_data`), `healthcheck` e `depends_on` com `service_healthy`.
- `.dockerignore` em cada contexto de build e `.env.example` para o Compose.
- `scripts/testar-containers.sh`: teste documentado de persistência dos dados após `docker compose down` e `up`.
- README com a seção do Módulo 3 (subir, variáveis, volumes, teste, comparação deploy direto × containers, publicação opcional no Render com imagens). O passo a passo de deploy no Render foi para `docs/deploy-render.md`.
- Novo diagrama: `docs/arquitetura-containers.svg` e `.png`.

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
