# Gerenciador de tarefas distribuído

Projeto incremental da 3ª unidade de **Sistemas Distribuídos** (UERN/DCC). Este repositório está no **Módulo 2 — Serviços / Microsserviços**: a API do Módulo 1 foi decomposta em três microsserviços independentes, cada um com seu próprio banco de dados, que se comunicam por HTTP.

- **Vídeo do Módulo 1:** _https://www.youtube.com/watch?v=KyOGIrHJiOc_
- **Frontend:** _https://https://tarefas-frontend-hn3e.onrender.com/_
- **tasks-service:** _https://SEU-TASKS.onrender.com/api/_
- **users-service:** _https://SEU-USERS.onrender.com/api/_
- **projects-service:** _https://SEU-PROJECTS.onrender.com/api/_

## Arquitetura

![Diagrama da arquitetura](docs/arquitetura.png)

| Serviço | Responsabilidade | Banco (Neon) | Chama |
|---|---|---|---|
| `tasks-service` | Tarefas (título, status, prioridade, data, `responsible_id`, `project_id`) | `tasks_db` | users e projects |
| `users-service` | Responsáveis (nome, e-mail) | `users_db` | ninguém |
| `projects-service` | Projetos (nome, cor) | `projects_db` | ninguém |
| Frontend (Angular) | Interface; chama os três serviços | — | os três |

Tecnologias: Python + Django + Django REST Framework (os três serviços), PostgreSQL no Neon, Angular 20, Render (hospedagem).

### Estrutura de pastas

```
services/
  tasks/      tasks-service    (Django: config/, tasks/, build.sh, requirements.txt)
  users/      users-service    (Django: config/, members/, ...)
  projects/   projects-service (Django: config/, projects/, ...)
frontend/     App Angular (src/app/, scripts/set-env.js)
docs/         arquitetura.svg e arquitetura.png
scripts/      testar-api.sh e testar-microsservicos.sh (testes com curl)
render.yaml   Atalho opcional para criar os serviços no Render
```

## Como os serviços se comunicam

A tarefa guarda apenas **ids** (`responsible_id`, `project_id`). Como cada serviço tem seu banco, não existe chave estrangeira entre eles; o `tasks-service` consulta os outros por HTTP:

- **Escrita (criar/editar tarefa com responsável ou projeto):** o `tasks-service` pergunta ao serviço dono do dado se o id existe (`GET /api/members/<id>/` ou `GET /api/projects/<id>/`). Se não existe, responde `400`.
- **Leitura (listar tarefas):** o `tasks-service` busca os nomes **em lote** (`GET /api/members/?ids=1,2,3`), uma chamada por serviço e **em paralelo**, e devolve cada tarefa com `responsible` e `project` já preenchidos.
- **Frontend:** usa o `tasks-service` para tarefas e fala direto com `users` e `projects` para o CRUD deles.

### Tratamento de falhas (requisito do Módulo 2)

Toda chamada entre serviços tem timeout (`SERVICE_TIMEOUT`, em segundos). O comportamento quando um serviço dependente está fora do ar:

| Situação | Resposta do tasks-service |
|---|---|
| Listar tarefas | Continua funcionando; o campo vem como `{"name": null, "state": "unavailable"}` e a interface mostra "indisponível" |
| Criar/editar tarefa **com** `responsible_id` ou `project_id` | `503` com a mensagem "O serviço de responsáveis está indisponível no momento. Tente novamente em instantes." |
| Criar tarefa sem responsável/projeto, editar o título, concluir, excluir | Funciona normalmente (não depende dos outros serviços) |
| O id foi excluído no outro serviço | `{"name": null, "state": "removed"}` e a interface mostra "removido" |

`GET /api/health/?deep=1` no `tasks-service` mostra o estado das dependências (`ok` ou `unavailable`).

## APIs

Todos os serviços têm `GET /api/health/` (testa o serviço e a conexão com o banco).

**tasks-service**

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/tasks/` | Lista tarefas (`?status=`, `?responsible_id=`, `?project_id=`) |
| POST | `/api/tasks/` | Cria tarefa |
| GET / PUT / PATCH / DELETE | `/api/tasks/<id>/` | Detalha, atualiza ou remove |

Campos: `title`, `description`, `status` (`pending`, `in_progress`, `done`), `priority` (1 = urgente ... 4 = baixa), `due_date` (`AAAA-MM-DD`), `responsible_id`, `project_id`; somente leitura: `responsible`, `project`, `created_at`, `updated_at` e `completed_at` (preenchido quando vira `done`, base do evento do Módulo 4).

**users-service**: `GET/POST /api/members/`, `GET/PUT/PATCH/DELETE /api/members/<id>/`, filtro `?ids=1,2,3`. Campos: `name`, `email`.

**projects-service**: `GET/POST /api/projects/`, `GET/PUT/PATCH/DELETE /api/projects/<id>/`, filtro `?ids=1,2,3`. Campos: `name`, `color` (`#RRGGBB`).

## Rodando localmente

Requisitos: Python 3.12+ e Node 20.19+ (ou 22.12+). Sem `DATABASE_URL`, cada serviço usa o seu próprio arquivo SQLite (`db.sqlite3` dentro da pasta do serviço), então os bancos já ficam separados.

Crie um ambiente virtual único na raiz do projeto e instale as dependências (o `tasks-service` tem todas as bibliotecas dos três):

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r services/tasks/requirements.txt
```

Depois abra **4 terminais**. Nos três primeiros, ative o ambiente virtual (`source .venv/bin/activate`) e defina `DEBUG=True` (`export DEBUG=True`; no PowerShell: `$env:DEBUG="True"`):

```bash
# Terminal 1 - users-service (porta 8001)
cd services/users && python manage.py migrate && python manage.py runserver 8001

# Terminal 2 - projects-service (porta 8002)
cd services/projects && python manage.py migrate && python manage.py runserver 8002

# Terminal 3 - tasks-service (porta 8000)
cd services/tasks && python manage.py migrate && python manage.py runserver 8000

# Terminal 4 - frontend (http://localhost:4200)
cd frontend && npm install && npm start
```

Suba `users` e `projects` antes do `tasks`, ou ele vai tratá-los como indisponíveis até que respondam. Para usar o PostgreSQL do Neon localmente, defina `DATABASE_URL` em cada terminal (cada serviço com o **seu** banco).

## Testando a comunicação entre os serviços

Com os três serviços no ar (local ou na nuvem):

```bash
# local
bash scripts/testar-microsservicos.sh

# nuvem (URLs na ordem: tasks, users, projects)
bash scripts/testar-microsservicos.sh https://SEU-TASKS.onrender.com https://SEU-USERS.onrender.com https://SEU-PROJECTS.onrender.com
```

O script faz o health check dos três serviços (o do `tasks` com `?deep=1`), cria um responsável e um projeto, cria uma tarefa que referencia os dois (o `tasks-service` valida os ids por HTTP), lista as tarefas com os nomes vindos dos outros serviços, confirma o erro `400` para um responsável inexistente, filtra por projeto e limpa os dados. No Windows, rode pelo Git Bash ou WSL. Tire **prints** da saída para a entrega.

**Teste de falha (manual):** pare o `users-service` (local: `Ctrl+C`; Render: _Settings > Suspend Service_) e repita:

1. Listar tarefas (`GET /api/tasks/`) continua funcionando, com `"responsible": {"name": null, "state": "unavailable"}`.
2. Criar uma tarefa com `responsible_id` responde `503` com a mensagem amigável.
3. Na interface aparece o aviso "Alguns nomes não puderam ser carregados…" e a barra lateral oferece "Tentar de novo".

`scripts/testar-api.sh` continua disponível e testa só o CRUD do `tasks-service` (teste do Módulo 1).

---

# Como hospedar no Render (passo a passo)

Tudo é gratuito e **não exige cartão**. Os nomes de botões e menus podem mudar um pouco com o tempo, mas a lógica é a mesma. Serão **4 serviços no Render** (3 Web Services + 1 Static Site) e **3 bancos no Neon**.

Ordem: **GitHub → bancos no Neon → users → projects → tasks → frontend → CORS**. Os serviços `users` e `projects` vêm antes porque o `tasks` e o frontend precisam das URLs deles.

> **Já publicou o Módulo 1?** Você reaproveita o que existe: o Neon e o Web Service atuais viram o `tasks-service`, e o Static Site continua sendo o frontend. Veja as notas "Se você já tem o Módulo 1" nos Passos 2, 5 e 6.

## Passo 1 — Atualizar o GitHub

```bash
git add .
git commit -m "Módulo 2: microsserviços (tasks, users, projects)"
git push
```

## Passo 2 — Criar os bancos no Neon (um por serviço)

No <https://neon.com>, crie **3 projetos** (plano gratuito, sem cartão): `tasks`, `users` e `projects`. Em cada um, clique em **Connect**, **desative "Connection pooling"** e copie a connection string completa (`postgresql://USUARIO:SENHA@ep-xxxx.../neondb?sslmode=require`). Anote qual é de qual serviço: são **três `DATABASE_URL` diferentes**. Trate-as como senhas.

> **Se você já tem o Módulo 1:** o projeto Neon que você já usa é o do `tasks`; crie só os projetos `users` e `projects`.

Por que um projeto por serviço: o banco de cada microsserviço é isolado (credencial e dados separados), e nenhum serviço consegue ler as tabelas do outro.

## Passo 3 — Publicar o users-service

Em <https://render.com>: **New + → Web Service** → escolha o repositório → **Connect**.

| Campo | Valor |
|---|---|
| Name | `tarefas-users` |
| Language | `Python 3` |
| Branch | `main` |
| Root Directory | `services/users` |
| Build Command | `bash build.sh` |
| Start Command | `gunicorn config.wsgi:application --workers 2` |
| Instance Type | **Free** |

Variáveis de ambiente:

| Chave | Valor |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DEBUG` | `False` |
| `SECRET_KEY` | string longa e aleatória (`python -c "import secrets; print(secrets.token_urlsafe(50))"`) |
| `DATABASE_URL` | a connection string do Neon do projeto `users` |
| `CORS_ALLOWED_ORIGINS` | por enquanto `http://localhost:4200` (ajustamos no Passo 7) |

Em _Advanced_, **Health Check Path**: `/api/health/`. Clique em **Create Web Service** e espere ficar **Live**. Teste `https://SUA-URL-USERS.onrender.com/api/health/`: deve mostrar `"service":"users"` e `"database":"postgresql"`. **Anote a URL.**

## Passo 4 — Publicar o projects-service

Igual ao passo anterior, mudando:

| Campo | Valor |
|---|---|
| Name | `tarefas-projects` |
| Root Directory | `services/projects` |
| `DATABASE_URL` | a connection string do Neon do projeto `projects` |

Teste `/api/health/` (deve mostrar `"service":"projects"`) e **anote a URL**.

## Passo 5 — Publicar o tasks-service

**Criando do zero:** **New + → Web Service**, mesmo repositório:

| Campo | Valor |
|---|---|
| Name | `tarefas-api` |
| Root Directory | `services/tasks` |
| Build Command | `bash build.sh` |
| Start Command | `gunicorn config.wsgi:application --workers 2 --timeout 60` |
| Instance Type | **Free** |

**Se você já tem o Módulo 1:** abra o serviço `tarefas-api` existente → _Settings_ e altere **Root Directory** de `backend` para `services/tasks` e o **Start Command** para o valor acima. O `DATABASE_URL` continua o mesmo. Atenção: a migration deste módulo remove o campo antigo `responsible` (texto), então o nome do responsável das tarefas antigas é descartado.

Variáveis de ambiente (as marcadas com ★ são novas neste módulo):

| Chave | Valor |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DEBUG` | `False` |
| `SECRET_KEY` | string longa e aleatória |
| `DATABASE_URL` | a connection string do Neon do projeto `tasks` |
| `CORS_ALLOWED_ORIGINS` | por enquanto `http://localhost:4200` |
| ★ `USERS_SERVICE_URL` | URL do users-service, **sem `/api` e sem barra no final** (ex.: `https://tarefas-users.onrender.com`) |
| ★ `PROJECTS_SERVICE_URL` | URL do projects-service, no mesmo formato |
| ★ `SERVICE_TIMEOUT` | `10` (segundos de espera por outro serviço) |

**Health Check Path**: `/api/health/`. Quando ficar **Live**, teste `https://SUA-URL-TASKS.onrender.com/api/health/?deep=1`: deve mostrar `"users":"ok"` e `"projects":"ok"`. Se mostrar `unavailable`, confira as duas URLs (e se os serviços estão acordados: veja "Plano gratuito" abaixo).

## Passo 6 — Atualizar o frontend

O frontend agora precisa das três URLs. No Static Site (`tarefas-frontend`; crie um novo, se ainda não tiver, como no Módulo 1: Root Directory `frontend`, Build Command `npm ci && npm run build`, Publish Directory `dist/frontend/browser`), em _Environment_:

| Chave | Valor |
|---|---|
| `NODE_VERSION` | `22.12.0` |
| `TASKS_API_URL` | `https://SUA-URL-TASKS.onrender.com/api` |
| `USERS_API_URL` | `https://SUA-URL-USERS.onrender.com/api` |
| `PROJECTS_API_URL` | `https://SUA-URL-PROJECTS.onrender.com/api` |

Aqui **as URLs terminam em `/api`**, ao contrário das do Passo 5. **Se você já tem o Módulo 1:** a antiga `API_URL` vira `TASKS_API_URL` (a `API_URL` ainda funciona como alternativa, mas use o nome novo) e você adiciona as outras duas. Depois faça **Manual Deploy → Clear build cache & deploy**, porque as URLs são gravadas no código durante o build. Anote a URL do frontend.

## Passo 7 — Liberar o frontend no CORS

Nos **três** Web Services (`users`, `projects` e `tasks`), em _Environment_, altere `CORS_ALLOWED_ORIGINS` para a URL do frontend, **sem barra no final** (ex.: `https://tarefas-frontend.onrender.com`). O Render reinicia cada serviço sozinho.

## Passo 8 — Testar

1. Abra o frontend: crie um projeto e um responsável pela barra lateral e depois uma tarefa escolhendo os dois.
2. Rode `bash scripts/testar-microsservicos.sh URL_TASKS URL_USERS URL_PROJECTS` e tire prints.
3. Faça o teste de falha (suspenda o `users-service` e veja o comportamento descrito acima).

## Atalho opcional: Blueprint (`render.yaml`)

O `render.yaml` da raiz descreve os 4 serviços. Em **New + → Blueprint**, selecione o repositório e o Render cria tudo, pedindo os valores marcados como secretos (`DATABASE_URL` de cada serviço, `CORS_ALLOWED_ORIGINS`, as URLs dos serviços). Como as URLs só existem depois que os serviços são criados, você terá de preencher `USERS_SERVICE_URL`, `PROJECTS_SERVICE_URL`, as três `*_API_URL` e o CORS e fazer um novo deploy. Os serviços usam o plano gratuito; confira na tela de confirmação se nenhum aparece com valor mensal.

---

## Limitações do plano gratuito (importante para a demonstração)

- **Cada serviço dorme sozinho** após ~15 minutos sem requisições e leva cerca de 1 minuto para acordar. Com 3 serviços, a **primeira requisição do dia pode ser lenta ou mostrar "indisponível"** para os nomes, porque o `tasks-service` espera no máximo `SERVICE_TIMEOUT` segundos por cada serviço dependente. **Antes de gravar ou apresentar, acorde os três**: abra `/api/health/` de `users` e `projects` e o `/api/health/?deep=1` de `tasks`. Se quiser que a primeira carga espere o serviço acordar em vez de mostrar "indisponível", aumente `SERVICE_TIMEOUT` (por exemplo para `45`; o `--timeout 60` do gunicorn já comporta isso).
- **Os serviços se chamam pelas URLs públicas** (`https://...onrender.com`): serviços web gratuitos do Render não recebem tráfego da rede privada.
- **Horas:** o Render dá 750 horas gratuitas por mês, somadas entre os serviços web; serviços dormindo não consomem horas. Não use "pings" para mantê-los acordados 24 horas.
- **Banco:** o Neon gratuito suspende o banco quando fica sem uso e reativa sozinho na consulta seguinte (cerca de 1 segundo). Os dados ficam preservados.
- Nunca coloque senhas ou a `SECRET_KEY` no código: tudo está em variáveis de ambiente, configuradas no painel.

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `/api/health/?deep=1` mostra `unavailable` | `USERS_SERVICE_URL`/`PROJECTS_SERVICE_URL` incorretas (sem `https://`, com `/api` no final) ou o serviço está dormindo. Acorde-o abrindo o `/api/health/` dele. |
| Nomes aparecem como "indisponível" logo após acordar | Normal no plano gratuito (partida a frio). Clique em "Atualizar" em alguns segundos, ou aumente `SERVICE_TIMEOUT`. |
| Build do serviço falha em `migrate` | `DATABASE_URL` errada ou copiada com pooling. Copie de novo no Neon. Cada serviço precisa da **sua** string. |
| Frontend carrega mas dá erro de CORS | `CORS_ALLOWED_ORIGINS` diferente da URL real do frontend em **algum** dos 3 serviços (confira `https` e a ausência de barra no final). |
| Frontend chama `localhost` em produção | As variáveis `*_API_URL` não estavam definidas no build. Defina e faça **Clear build cache & deploy**. |
| Tarefas antigas perderam o responsável | Esperado: a migration `0003` troca o campo texto `responsible` por `responsible_id`. Reatribua pela interface. |
| `/api/health/` responde `sqlite` | `DATABASE_URL` não está definida naquele serviço. |

## Justificativas técnicas

| Decisão | Por quê |
|---|---|
| Dividir em tarefas, responsáveis e projetos | Contextos de negócio distintos, com dados e ciclo de vida próprios; cada um pode mudar, escalar e falhar de forma independente |
| Um banco (um projeto Neon) por serviço | Isolamento de dados: nenhum serviço lê as tabelas do outro; a integração acontece só pela API |
| Ids em vez de chaves estrangeiras entre serviços | Bancos separados não permitem FK; a consistência é garantida pelas chamadas HTTP (validação na escrita e estado `removed` na leitura) |
| HTTP/REST síncrono entre serviços | Exigido pelo Módulo 2 e simples de testar; a comunicação assíncrona entra no Módulo 4 |
| Consulta em lote (`?ids=`) e em paralelo | Evita uma chamada por tarefa (problema N+1) e reduz a latência de cada listagem |
| Timeout e resposta degradada | Um serviço fora do ar não derruba os demais: a leitura continua e a escrita falha com mensagem clara |
| Mesma stack (Django REST) nos três serviços | Reaproveita o código do Módulo 1 e mantém o projeto simples de manter e de containerizar no Módulo 3 |
| Neon + Render | Planos gratuitos sem cartão; deploy a partir do Git; o PostgreSQL gratuito do Render expira em 30 dias |

## Checklist de entrega — Módulo 2

- [ ] Repositório atualizado, com uma pasta por serviço (`services/tasks`, `services/users`, `services/projects`)
- [ ] 3 serviços publicados no Render, cada um com seu banco, e frontend atualizado
- [ ] Diagrama da arquitetura (`docs/arquitetura.png`) e URLs públicas no topo deste README
- [ ] Prints ou saída do `scripts/testar-microsservicos.sh` contra as URLs públicas
- [ ] Teste de falha documentado (print com um serviço suspenso)
- [ ] `CHANGELOG.md` atualizado
- [ ] Tag da entrega: `git tag entrega-2-microsservicos && git push origin entrega-2-microsservicos`

## Histórico e próximos módulos

- **Módulo 1 (Computação em Nuvem):** tag `entrega-1-cloud`, com a API única publicada no Render.
- **Módulo 3 (Containers):** cada serviço ganhará um `Dockerfile` e haverá um `docker-compose.yml` com os serviços e os bancos.
- **Módulo 4 (Mensageria):** o `tasks-service` publicará o evento "tarefa concluída" no RabbitMQ (o campo `completed_at` já existe) e um serviço consumidor confirmará o recebimento.
