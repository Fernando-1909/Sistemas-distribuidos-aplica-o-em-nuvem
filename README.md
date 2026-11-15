# Gerenciador de tarefas distribuído

Projeto incremental da 3ª unidade de **Sistemas Distribuídos** (UERN/DCC). A mesma aplicação (um gerenciador de tarefas) evolui a cada módulo. Este repositório está no **Módulo 3 — Containers**: cada microsserviço tem o seu `Dockerfile` e o sistema inteiro, com os bancos, sobe com um único comando (`docker compose up`).

- **Vídeo do Módulo 1:** _https://www.youtube.com/watch?v=KyOGIrHJiOc_
- **Frontend:** _https://https://tarefas-frontend-hn3e.onrender.com/_
- **tasks-service:** _https://SEU-TASKS.onrender.com/api/_
- **users-service:** _https://SEU-USERS.onrender.com/api/_
- **projects-service:** _https://SEU-PROJECTS.onrender.com/api/_

## Arquitetura dos serviços (Módulo 2)

![Diagrama da arquitetura](docs/arquitetura.png)

| Serviço | Responsabilidade | Banco | Chama |
|---|---|---|---|
| `tasks-service` | Tarefas (título, status, prioridade, data, `responsible_id`, `project_id`) | `tasks_db` | users e projects |
| `users-service` | Responsáveis (nome, e-mail) | `users_db` | ninguém |
| `projects-service` | Projetos (nome, cor) | `projects_db` | ninguém |
| Frontend (Angular) | Interface; chama os três serviços | — | os três |

Tecnologias: Python + Django + Django REST Framework (os três serviços), PostgreSQL, Angular 20, Docker, Render e Neon (nuvem).

### Estrutura de pastas

```
services/
  tasks/      tasks-service    (Dockerfile, entrypoint.sh, config/, tasks/, ...)
  users/      users-service    (Dockerfile, entrypoint.sh, config/, members/, ...)
  projects/   projects-service (Dockerfile, entrypoint.sh, config/, projects/, ...)
frontend/     App Angular (Dockerfile, nginx.conf, src/)
docs/         diagramas e o guia de deploy no Render (deploy-render.md)
scripts/      testar-containers.sh, testar-microsservicos.sh, testar-api.sh
docker-compose.yml   sobe tudo localmente: 3 serviços + 3 bancos + frontend
.env.example         valores opcionais para o Compose
render.yaml          atalho para o deploy sem Docker no Render
```

## Como os serviços se comunicam

A tarefa guarda apenas **ids** (`responsible_id`, `project_id`). Como cada serviço tem o seu banco, não existe chave estrangeira entre eles; o `tasks-service` consulta os outros por HTTP:

- **Escrita:** ao criar/editar uma tarefa com responsável ou projeto, ele confirma que o id existe (`GET /api/members/<id>/` ou `/api/projects/<id>/`). Se não existe, responde `400`.
- **Leitura:** busca os nomes **em lote** (`GET /api/members/?ids=1,2,3`), uma chamada por serviço e **em paralelo**, e devolve cada tarefa com `responsible` e `project` já preenchidos.
- **Frontend:** usa o `tasks-service` para tarefas e fala direto com `users` e `projects` para o CRUD deles.

**Tratamento de falhas:** toda chamada entre serviços tem timeout (`SERVICE_TIMEOUT`).

| Situação (um serviço dependente fora do ar) | Resposta do tasks-service |
|---|---|
| Listar tarefas | Continua funcionando; o campo vem como `{"name": null, "state": "unavailable"}` e a interface mostra "indisponível" |
| Criar/editar tarefa **com** `responsible_id` ou `project_id` | `503` com mensagem amigável ("O serviço de responsáveis está indisponível no momento...") |
| Criar sem responsável/projeto, editar o título, concluir, excluir | Funciona normalmente |
| O id foi excluído no outro serviço | `{"name": null, "state": "removed"}` |

`GET /api/health/?deep=1` no `tasks-service` mostra o estado das dependências (`ok` ou `unavailable`).

## APIs

Todos os serviços têm `GET /api/health/` (testa o serviço e a conexão com o banco).

| Serviço | Rotas | Observações |
|---|---|---|
| tasks | `GET/POST /api/tasks/`, `GET/PUT/PATCH/DELETE /api/tasks/<id>/` | Filtros `?status=`, `?responsible_id=`, `?project_id=`. Campos: `title`, `description`, `status` (`pending`, `in_progress`, `done`), `priority` (1 a 4), `due_date`, `responsible_id`, `project_id`. Somente leitura: `responsible`, `project`, `created_at`, `updated_at`, `completed_at` |
| users | `GET/POST /api/members/`, `GET/PUT/PATCH/DELETE /api/members/<id>/` | Filtro `?ids=1,2,3`. Campos: `name`, `email` |
| projects | `GET/POST /api/projects/`, `GET/PUT/PATCH/DELETE /api/projects/<id>/` | Filtro `?ids=1,2,3`. Campos: `name`, `color` (`#RRGGBB`) |

---

# Módulo 3 — Containers

## O que foi feito

- **Um `Dockerfile` por serviço** (`services/tasks`, `services/users`, `services/projects`) e um para o frontend.
- **`docker-compose.yml`** que orquestra **7 containers**: 3 serviços Django, 3 bancos PostgreSQL (um por serviço) e o frontend servido por nginx.
- **Variáveis de ambiente** no Compose (com valores de desenvolvimento por padrão e `.env` opcional) e **volumes nomeados** para os dados dos bancos.
- **Teste documentado** de que os dados persistem após `docker compose down` e `up` (`scripts/testar-containers.sh`).
- **Comparação** entre o deploy direto (Módulos 1 e 2) e o conteinerizado, mais abaixo.

![Diagrama com containers](docs/arquitetura-containers.png)

## Subindo o sistema

```bash
docker compose up --build -d     # constrói as imagens e sobe tudo em segundo plano
docker compose ps                # estado dos containers (STATUS "healthy" quando prontos)
docker compose logs -f tasks     # acompanha os logs de um serviço
docker compose down              # para e remove os containers (os DADOS ficam nos volumes)
docker compose down -v           # para e APAGA os dados (remove os volumes)
```

| Container | Imagem | Porta no host | Função |
|---|---|---|---|
| `frontend` | `tarefas/frontend` (nginx) | **4200** | Interface Angular já compilada |
| `tasks` | `tarefas/tasks` | **8000** | API de tarefas |
| `users` | `tarefas/users` | **8001** | API de responsáveis |
| `projects` | `tarefas/projects` | **8002** | API de projetos |
| `tasks-db`, `users-db`, `projects-db` | `postgres:16-alpine` | não publicada | Um PostgreSQL por serviço, cada um com seu volume |

O Compose espera cada banco ficar saudável antes de subir o serviço dele, e o `tasks` só sobe depois de `users` e `projects` estarem saudáveis (`depends_on` com `condition: service_healthy`).

## Os Dockerfiles

Os três serviços usam o mesmo modelo (`services/<serviço>/Dockerfile`). Boas práticas aplicadas:

| Prática | Como aparece no Dockerfile |
|---|---|
| Imagem base enxuta | `python:3.12-slim` (e `nginx:alpine` no frontend) |
| **Multi-stage build** | O estágio `builder` instala as dependências em um virtualenv; a imagem final só copia o virtualenv pronto. No frontend, o estágio com Node e `node_modules` (centenas de MB) compila o Angular e **só os arquivos compilados** vão para a imagem do nginx |
| Cache de camadas | `requirements.txt` (e `package.json`) são copiados antes do código: mudar o código não refaz a instalação das dependências |
| Usuário sem privilégios | O processo roda como o usuário `app`, não como root |
| `.dockerignore` | Fora da imagem: `.venv`, `__pycache__`, `db.sqlite3`, `.env`, `node_modules` |
| Sem segredos na imagem | `SECRET_KEY` e `DATABASE_URL` entram só por variável de ambiente, na hora de rodar |
| `HEALTHCHECK` | O Docker marca o container como `healthy` quando `/api/health/` responde (no frontend, quando o nginx responde) |
| Porta configurável | O `entrypoint.sh` usa `$PORT` (padrão 8000); plataformas como o Render definem essa variável |
| Migrações automáticas | O `entrypoint.sh` roda `migrate` antes de iniciar o `gunicorn` |

## Variáveis de ambiente

Definidas no `docker-compose.yml`. Para trocar senhas/chave, copie `.env.example` para `.env` (o `.env` não vai para o Git).

| Variável | Onde | Valor no Compose | Para que serve |
|---|---|---|---|
| `SECRET_KEY` | os 3 serviços | `.env` ou um valor de desenvolvimento | Chave secreta do Django |
| `DEBUG` | os 3 serviços | `False` | Modo produção |
| `DATABASE_URL` | cada serviço | `postgresql://users:SENHA@users-db:5432/users_db` (e equivalentes) | Conexão com o **seu** banco. O host (`users-db`) é o nome do container |
| `ALLOWED_HOSTS` | cada serviço | `localhost,127.0.0.1,<nome do serviço>` | Hosts aceitos (o nome do serviço permite a chamada entre containers) |
| `CORS_ALLOWED_ORIGINS` | os 3 serviços | `http://localhost:4200` | Libera o frontend no navegador |
| `USERS_SERVICE_URL`, `PROJECTS_SERVICE_URL` | tasks | `http://users:8000`, `http://projects:8000` | Endereço dos outros serviços **dentro da rede do Compose** |
| `SERVICE_TIMEOUT` | tasks | `5` | Segundos de espera por outro serviço |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | bancos | `users_db`/`users`/`USERS_DB_PASSWORD` (e equivalentes) | Criam o banco na primeira inicialização |
| `TASKS_API_URL`, `USERS_API_URL`, `PROJECTS_API_URL` | frontend (**build args**) | `http://localhost:8000/api` (8001 e 8002) | Endereços que o **navegador** usa; são gravados no código no build |

## Volumes e persistência

Cada banco grava seus dados em um **volume nomeado**: `tarefas_users_data`, `tarefas_projects_data` e `tarefas_tasks_data`. Um volume existe independentemente dos containers, então `docker compose down` remove os containers, mas **não** os dados. Só `docker compose down -v` apaga os volumes.

```bash
docker volume ls --filter name=tarefas_    # lista os volumes do projeto
```

## Teste documentado: os dados persistem após `down` e `up`

```bash
bash scripts/testar-containers.sh          # no Windows, use o Git Bash ou o WSL
```

O script: (1) sobe tudo; (2) faz o health check dos 3 serviços; (3) cria um responsável, um projeto e uma tarefa que referencia os dois; (4) executa `docker compose down` e mostra que não há containers, mas os 3 volumes continuam; (5) sobe tudo de novo; (6) lista as tarefas e confere que os dados dos **três** bancos continuam lá. Tire **prints** da saída. Exemplo de execução:

```text
==> 1. Subindo tudo (docker compose up --build --wait)
NAME                    IMAGE                     STATUS                    PORTS
tarefas-frontend-1      tarefas/frontend:latest   Up 5 seconds (healthy)    0.0.0.0:4200->80/tcp
tarefas-projects-1      tarefas/projects:latest   Up 12 seconds (healthy)   0.0.0.0:8002->8000/tcp
tarefas-projects-db-1   postgres:16-alpine        Up 17 seconds (healthy)   5432/tcp
tarefas-tasks-1         tarefas/tasks:latest      Up 6 seconds (healthy)    0.0.0.0:8000->8000/tcp
tarefas-tasks-db-1      postgres:16-alpine        Up 17 seconds (healthy)   5432/tcp
tarefas-users-1         tarefas/users:latest      Up 12 seconds (healthy)   0.0.0.0:8001->8000/tcp
tarefas-users-db-1      postgres:16-alpine        Up 17 seconds (healthy)   5432/tcp

==> 2. Health check dos 3 serviços
{"status":"ok","service":"users","database":"postgresql"}
{"status":"ok","service":"projects","database":"postgresql"}
{"status":"ok","service":"tasks","database":"postgresql","dependencies":{"users":"ok","projects":"ok"}}

==> 3. Criando dados: responsável, projeto e tarefa
Criados: responsável 1, projeto 1 e a tarefa "Persistência 154819"

==> 4. Derrubando os containers (docker compose down) - os volumes são mantidos
Containers em execução agora:
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS
Volumes que continuam existindo:
local     tarefas_projects_data
local     tarefas_tasks_data
local     tarefas_users_data

==> 6. Tarefas DEPOIS do down/up
[{"id":1,"title":"Persistência 154819", ... "responsible":{"id":1,"name":"Ana (teste Docker)","state":"ok"}, ...}]
OK: os dados dos 3 bancos persistiram após docker compose down/up.
```

Para confirmar que `down -v` realmente apaga: rode `docker compose down -v`, suba de novo e `curl http://localhost:8000/api/tasks/` devolve `[]`.

**Teste de falha com containers:** `docker compose stop users` e, no site, as tarefas continuam aparecendo com o responsável "indisponível"; criar tarefa com responsável mostra a mensagem amigável. `docker compose start users` religa o serviço.

## Comparação: deploy direto (Módulos 1 e 2) × containers (Módulo 3)

| Aspecto | Deploy direto no Render | Com containers (Docker) |
|---|---|---|
| Como o código vai para o ar | O Render clona o repositório e executa `build.sh` e o comando de início | Uma **imagem** é construída a partir do `Dockerfile`, com código, dependências e comando de início juntos |
| Ambiente (Python, bibliotecas) | Escolhido no painel (`PYTHON_VERSION`) e instalado pelo Render a cada build | Fixado dentro da imagem: o mesmo ambiente em qualquer máquina |
| Subir o sistema inteiro | Criar 4 serviços no painel, copiar URLs, configurar variáveis e CORS | `docker compose up` |
| Configuração | Variáveis no painel do Render | Variáveis no `docker-compose.yml` e no `.env` |
| Comunicação entre serviços | Por URLs públicas HTTPS (`...onrender.com`), passando pela internet | Pela rede interna do Compose, pelo nome do serviço (`http://users:8000`) |
| Banco de dados | Neon, na nuvem | PostgreSQL em container, com volume, na máquina local |
| Isolamento | Processos no ambiente do provedor | Cada serviço em seu container (sistema de arquivos, rede e usuário próprios) |
| Partida a frio | Serviços gratuitos dormem após 15 min (cerca de 1 min para acordar) | Containers ficam rodando; não há "sono" |
| Depuração | Logs no painel | `docker compose logs -f` e `docker compose exec` |

**O que mudou:** o artefato de entrega passou a ser a imagem e não mais o código solto, o ambiente ficou descrito em arquivo (`Dockerfile`) e os serviços passaram a se comunicar por uma rede interna com nomes, em vez de URLs públicas.

**O que ficou mais fácil:** reproduzir o ambiente (quem clonar o repositório roda tudo com um comando, sem instalar Python, Node ou PostgreSQL), subir e derrubar o sistema inteiro, evitar o problema de "na minha máquina funciona", e testar sem depender da internet ou do tempo de despertar dos serviços gratuitos.

**O que ficou mais difícil:** é preciso aprender Docker e Compose (imagens, camadas, volumes, redes); há mais arquivos para manter; as imagens ocupam disco e o build leva tempo; o frontend grava as URLs das APIs no build, então mudar uma porta exige reconstruir a imagem; e é preciso cuidar dos volumes (`down -v` apaga tudo e a senha do banco só é aplicada na primeira inicialização).

## Publicar na nuvem usando as imagens (opcional)

O Render também aceita um `Dockerfile`. Para experimentar com **um** serviço, por exemplo o `users` (sugestão: crie um serviço novo, para não mexer no que já funciona):

1. **New + → Web Service** → repositório → em **Language**, escolha **Docker**.
2. **Root Directory** `services/users`. Se o Render não achar o Dockerfile, ajuste o campo **Dockerfile Path** (por exemplo `./services/users/Dockerfile`) e o contexto de build.
3. Não há Build Command nem Start Command: quem inicia é o `ENTRYPOINT` da imagem, que usa a porta `$PORT` fornecida pelo Render.
4. Variáveis de ambiente iguais às do deploy direto (`DEBUG`, `SECRET_KEY`, `DATABASE_URL` do Neon, `CORS_ALLOWED_ORIGINS`...); `PYTHON_VERSION` não é mais necessária.
5. **Health Check Path**: `/api/health/`.

Esta parte é opcional no trabalho e não foi exercitada no Render; o `PORT` customizado foi validado localmente.

## Comandos úteis

```bash
docker compose build tasks          # reconstrói a imagem de um serviço
docker compose up -d --build tasks  # reconstrói e reinicia só esse serviço
docker compose exec tasks sh        # abre um terminal dentro do container
docker compose exec users-db psql -U users -d users_db -c '\dt'   # tabelas do banco do users
docker compose logs --tail 50 users
docker compose images               # tamanho das imagens
docker system prune                 # limpa imagens/containers sem uso
```

## Problemas comuns (Docker)

| Sintoma | Causa provável e solução |
|---|---|
| `port is already allocated` / `Bind for 0.0.0.0:8000 failed` | A porta já está em uso (por exemplo, um `runserver` local). Pare o processo ou mude o lado esquerdo da porta no Compose (e o build arg do frontend) |
| `docker: 'compose' is not a docker command` | Docker antigo, sem o plugin Compose v2. Atualize o Docker (ou use `docker-compose`) |
| Um serviço fica `unhealthy` ou reinicia | `docker compose logs <serviço>`. Causa comum: a senha do banco foi trocada no `.env` depois que o volume já existia (a senha só vale na primeira inicialização). Recrie os dados com `docker compose down -v` |
| Frontend não encontra as APIs depois de mudar portas | As URLs são gravadas no build. Rode `docker compose build frontend` e suba de novo |
| `exec /app/entrypoint.sh: no such file` ou `\r: command not found` (Windows) | Quebras de linha CRLF. O `.gitattributes` força LF; se o arquivo já foi baixado com CRLF, rode `git add --renormalize .` e reconstrua |
| Erro de CORS ao abrir o frontend por outro endereço | Ajuste `CORS_ALLOWED_ORIGINS` no Compose para incluir esse endereço |
| Pouco espaço em disco | `docker system prune` (remove o que não está em uso) |

---

## Rodando localmente sem Docker

Requisitos: Python 3.12+ e Node 20.19+ (ou 22.12+). Sem `DATABASE_URL`, cada serviço usa o seu próprio SQLite.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r services/tasks/requirements.txt
export DEBUG=True                  # PowerShell: $env:DEBUG="True"
```

Em 4 terminais (os três primeiros com o ambiente virtual ativo e `DEBUG=True`):

```bash
cd services/users    && python manage.py migrate && python manage.py runserver 8001
cd services/projects && python manage.py migrate && python manage.py runserver 8002
cd services/tasks    && python manage.py migrate && python manage.py runserver 8000
cd frontend          && npm install && npm start            # http://localhost:4200
```

## Scripts de teste

| Script | O que testa |
|---|---|
| `scripts/testar-containers.sh` | **Módulo 3:** sobe o Compose e prova a persistência dos dados após `down`/`up` |
| `scripts/testar-microsservicos.sh [URL_TASKS URL_USERS URL_PROJECTS]` | Módulo 2: comunicação entre os serviços (local ou na nuvem) |
| `scripts/testar-api.sh [URL]` | Módulo 1: CRUD do `tasks-service` |

No Windows, rode os scripts pelo Git Bash ou pelo WSL.

## Deploy no Render (sem Docker)

O passo a passo completo está em **[docs/deploy-render.md](docs/deploy-render.md)**. Resumo das regras de URL que mais causam erro:

| Onde | Formato |
|---|---|
| `USERS_SERVICE_URL` e `PROJECTS_SERVICE_URL` (no tasks) | `https://...onrender.com` (**sem** `/api`) |
| `TASKS_API_URL`, `USERS_API_URL`, `PROJECTS_API_URL` (no site) | `https://...onrender.com/api` (**com** `/api`) |
| `CORS_ALLOWED_ORIGINS` (nos 3 serviços) | URL do site, sem barra no final |

## Justificativas técnicas

| Decisão | Por quê |
|---|---|
| Dividir em tarefas, responsáveis e projetos | Contextos distintos, com dados e ciclo de vida próprios; cada um muda, escala e falha de forma independente |
| Um banco por serviço (também no Compose) | Isolamento de dados: nenhum serviço lê as tabelas do outro; a integração acontece só pela API |
| Ids em vez de chaves estrangeiras entre serviços | Bancos separados não permitem FK; a consistência vem das chamadas HTTP (validação na escrita, estado `removed` na leitura) |
| HTTP síncrono, em lote e em paralelo, com timeout | Simples de testar; evita uma chamada por tarefa; um serviço fora do ar não derruba os demais |
| Um container por serviço e por banco | Cada peça isolada, com seu próprio ciclo de vida: dá para reiniciar o `users` sem tocar no `tasks` |
| Dockerfile multi-stage, base slim e usuário não-root | Imagens menores, mais seguras e com cache de build eficiente |
| Volumes nomeados | Os dados dos bancos sobrevivem à recriação dos containers |
| `healthcheck` + `depends_on: service_healthy` | Ordem de inicialização correta (banco antes do serviço, serviços antes do `tasks`) sem `sleep` |
| Compose em vez de Kubernetes | O trabalho pede orquestração local; o Compose resolve com poucos arquivos (Kubernetes é opcional) |
| Neon + Render na nuvem | Planos gratuitos sem cartão; deploy a partir do Git |

## Checklist de entrega — Módulo 3

- [ ] `Dockerfile` de cada serviço (`services/tasks`, `services/users`, `services/projects`) e do `frontend`
- [ ] `docker-compose.yml` orquestrando serviços + bancos, com variáveis de ambiente e volumes
- [ ] Prints (ou saída) do `scripts/testar-containers.sh` mostrando que os dados persistem após `down`/`up`
- [ ] Seção de comparação deste README (deploy direto × containers)
- [ ] Vídeo curto no YouTube (**não listado**) mostrando os containers rodando, com o link no topo deste README
- [ ] `CHANGELOG.md` atualizado
- [ ] Tag da entrega: `git tag entrega-3-containers && git push origin entrega-3-containers`

## Próximo módulo

**Módulo 4 (Mensageria):** o `tasks-service` publicará o evento "tarefa concluída" no RabbitMQ (o campo `completed_at` já existe) e um serviço consumidor confirmará o recebimento. O `docker-compose.yml` ganhará o container `rabbitmq` (imagem `rabbitmq:management`).
