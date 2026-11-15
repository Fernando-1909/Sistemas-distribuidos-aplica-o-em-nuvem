# Como hospedar no Render (Módulos 1 e 2)

Guia de deploy **sem Docker** (o Render clona o repositório e roda o código direto). Tudo é gratuito e **não exige cartão**. Os nomes de botões e menus podem mudar um pouco com o tempo, mas a lógica é a mesma.

Serão **4 serviços no Render** (3 Web Services + 1 Static Site) e **3 bancos PostgreSQL no Neon**. Ordem: **GitHub → bancos no Neon → users → projects → tasks → frontend → CORS**. Os serviços `users` e `projects` vêm antes porque o `tasks` e o frontend precisam das URLs deles.

## As 3 regras de URL (onde a maioria dos erros acontece)

| Onde | Formato | Exemplo |
|---|---|---|
| `USERS_SERVICE_URL` e `PROJECTS_SERVICE_URL` (no **tasks**) | `https://...onrender.com`, **sem** `/api` e **sem** barra no final | `https://tarefas-users.onrender.com` |
| `TASKS_API_URL`, `USERS_API_URL`, `PROJECTS_API_URL` (no **site**) | `https://...onrender.com/api`, **com** `/api`, sem barra no final | `https://tarefas-users.onrender.com/api` |
| `CORS_ALLOWED_ORIGINS` (nos **3 serviços**) | a URL do **site**, sem barra no final | `https://tarefas-frontend-hn3e.onrender.com` |

Copie as URLs com o botão de copiar do Render, em vez de digitar. Uma letra errada já quebra a comunicação.

## Passo 1 — GitHub

```bash
git add .
git commit -m "Atualização do projeto"
git push
```

O Render refaz o deploy sozinho a cada `push`.

## Passo 2 — Bancos no Neon (um por serviço)

No <https://neon.com> crie os bancos `users_db` e `projects_db` (podem ficar no mesmo projeto Neon do `tasks`, que usa `neondb`) ou dois projetos novos. Para cada banco, clique em **Connect**, escolha o banco no campo **Database**, **desative "Connection pooling"** e copie a connection string:

```
postgresql://USUARIO:SENHA@ep-xxxx.../users_db?sslmode=require
```

O nome antes do `?` precisa ser o do banco certo. São **três `DATABASE_URL` diferentes** (uma por serviço); trate-as como senhas.

## Passo 3 — users-service

No Render: **New + → Web Service** → repositório → **Connect**.

| Campo | Valor |
|---|---|
| Name | `tarefas-users` |
| Language | `Python 3` |
| Branch | `main` |
| Root Directory | `services/users` |
| Build Command | `bash build.sh` |
| Start Command | `gunicorn config.wsgi:application --workers 2` |
| Instance Type | **Free** |

Variáveis de ambiente (preencha **antes** de criar, porque o build já roda as migrações):

| Chave | Valor |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DEBUG` | `False` |
| `SECRET_KEY` | string longa e aleatória |
| `DATABASE_URL` | a string do banco `users_db` |
| `CORS_ALLOWED_ORIGINS` | a URL do site (sem barra no final) |

Em _Advanced_, **Health Check Path**: `/api/health/`. Quando ficar **Live**, abra `URL/api/health/`: deve mostrar `"service":"users"` e `"database":"postgresql"`. Anote a URL.

## Passo 4 — projects-service

Igual ao passo 3, mudando: Name `tarefas-projects`, Root Directory `services/projects` e a `DATABASE_URL` do banco `projects_db`. Teste `/api/health/` e anote a URL.

## Passo 5 — tasks-service

| Campo | Valor |
|---|---|
| Name | `tarefas-api` |
| Root Directory | `services/tasks` |
| Build Command | `bash build.sh` |
| Start Command | `gunicorn config.wsgi:application --workers 2 --timeout 60` |
| Instance Type | **Free** |

| Chave | Valor |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DEBUG` | `False` |
| `SECRET_KEY` | string longa e aleatória |
| `DATABASE_URL` | a string do banco `neondb` |
| `CORS_ALLOWED_ORIGINS` | a URL do site |
| `USERS_SERVICE_URL` | URL do users (regra 1: sem `/api`) |
| `PROJECTS_SERVICE_URL` | URL do projects (regra 1: sem `/api`) |
| `SERVICE_TIMEOUT` | `10` |

Teste `URL/api/health/?deep=1`: o resultado certo é `"users": "ok"` e `"projects": "ok"`. Se aparecer `unavailable`, abra os **Logs** do tasks e procure linhas que começam com "Falha ao chamar": elas dizem o motivo exato.

## Passo 6 — Frontend (Static Site)

Crie o Static Site (Root Directory `frontend`, Build Command `npm ci && npm run build`, Publish Directory `dist/frontend/browser`) e em _Environment_ coloque:

| Chave | Valor |
|---|---|
| `NODE_VERSION` | `22.12.0` |
| `TASKS_API_URL` | `https://SUA-URL-TASKS.onrender.com/api` |
| `USERS_API_URL` | `https://SUA-URL-USERS.onrender.com/api` |
| `PROJECTS_API_URL` | `https://SUA-URL-PROJECTS.onrender.com/api` |

Depois faça **Manual Deploy → Clear build cache & deploy**: as URLs são gravadas no código durante o build, então mudar uma variável sem refazer o build não adianta.

## Passo 7 — CORS

Nos **três** Web Services, em _Environment_, confira se `CORS_ALLOWED_ORIGINS` é exatamente a URL do site, sem barra no final e sem `https://` repetido.

## Passo 8 — Testar

1. Abra o site: crie um projeto e um responsável pela barra lateral e depois uma tarefa escolhendo os dois.
2. Rode `bash scripts/testar-microsservicos.sh URL_TASKS URL_USERS URL_PROJECTS` e tire prints.
3. Faça o teste de falha: suspenda o `users-service` (_Settings > Suspend Service_) e veja o comportamento descrito no README.

## Se você já tinha o deploy do Módulo 1

Reaproveite: o Neon e o Web Service antigos viram o `tasks-service` (em _Settings_, troque o Root Directory de `backend` para `services/tasks` e o Start Command), o Static Site continua sendo o frontend (a antiga `API_URL` vira `TASKS_API_URL`, e você adiciona as outras duas). A migration do Módulo 2 troca o campo texto `responsible` por `responsible_id`, então o nome do responsável das tarefas antigas é descartado.

## Atalho opcional: Blueprint

O `render.yaml` da raiz descreve os 4 serviços. Em **New + → Blueprint**, o Render cria tudo e pede os valores secretos. Como as URLs só existem depois que os serviços são criados, você ainda terá de preencher as URLs e o CORS e fazer um novo deploy.

## Limitações do plano gratuito

- **Cada serviço dorme** após ~15 minutos sem requisições e leva cerca de 1 minuto para acordar. Com 3 serviços, a primeira requisição do dia pode mostrar "indisponível" para os nomes. Antes de gravar ou apresentar, abra o `/api/health/` de cada serviço para acordá-los. Para a primeira carga esperar em vez de falhar, aumente `SERVICE_TIMEOUT` (ex.: `45`; o `--timeout 60` do gunicorn comporta).
- **Os serviços se chamam pelas URLs públicas**: serviços web gratuitos não recebem tráfego da rede privada.
- **Horas:** 750 horas gratuitas por mês somadas entre os serviços web; serviços dormindo não consomem. Não use "pings" para mantê-los acordados.
- **Neon:** suspende o banco sem uso e reativa sozinho na consulta seguinte (cerca de 1 segundo); os dados ficam preservados.

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| Site mostra "serviço indisponível" mesmo com os 3 serviços no ar | As variáveis `*_API_URL` do site estão **sem `/api`** (regra 2) ou o site não foi refeito com **Clear build cache**. |
| `/api/health/?deep=1` mostra `unavailable` | `USERS_SERVICE_URL`/`PROJECTS_SERVICE_URL` incorretas (sem `https://`, com `/api`) ou o serviço está dormindo. Veja "Falha ao chamar" nos Logs do tasks. |
| Erro de CORS no navegador | `CORS_ALLOWED_ORIGINS` diferente da URL do site em algum dos 3 serviços. |
| Build do serviço falha em `migrate` | `DATABASE_URL` errada, vazia ou copiada com pooling ligado. Cada serviço precisa da **sua** string. |
| Deploy antigo falhou após reorganizar pastas | O Root Directory ainda aponta para uma pasta que não existe mais. Ajuste em _Settings_. |
| `/api/health/` responde `sqlite` | `DATABASE_URL` não está definida naquele serviço. |
