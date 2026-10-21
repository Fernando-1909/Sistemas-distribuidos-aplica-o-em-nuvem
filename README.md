# névoa — Gerenciador de tarefas distribuído

Projeto incremental da 3ª unidade de **Sistemas Distribuídos** (UERN/DCC).
Este repositório corresponde ao **Módulo 1 — Computação em Nuvem**: uma API REST com CRUD de tarefas, banco de dados hospedado e URL pública, mais um frontend Angular para usar a API.

- **Vídeo de demonstração:** _cole aqui o link do YouTube (não listado)_
- **Frontend (URL pública):** _https://SEU-FRONTEND.onrender.com_
- **API (URL pública):** _https://SEU-BACKEND.onrender.com/api/_

## Arquitetura (Módulo 1)

```
 Navegador ──► Frontend Angular ──► API Django (REST) ──► PostgreSQL
              (Render · Static)     (Render · Web Service)   (Neon · free)
```

| Camada   | Tecnologia                              | Onde roda                  |
|----------|-----------------------------------------|----------------------------|
| Frontend | Angular 20 (tema escuro roxo/rosa)      | Render — Static Site       |
| Backend  | Python + Django + Django REST Framework | Render — Web Service       |
| Banco    | PostgreSQL                              | Neon — plano gratuito      |

**Por que o PostgreSQL fica no Neon e não no Render?** O Render tem PostgreSQL gratuito, mas ele **expira 30 dias após a criação** (e depois é apagado). Como o projeto vai até a entrega do Módulo 4 e pode ser corrigido depois, usamos o Neon, que é gratuito, não pede cartão e não expira. O código lê uma única variável, `DATABASE_URL`, então trocar de provedor (Render Postgres, Aiven, Supabase...) é só trocar o valor dela, sem mexer no código.

### Estrutura de pastas

```
backend/    API Django (config/, tasks/, build.sh, requirements.txt)
frontend/   App Angular (src/app/, scripts/set-env.js)
scripts/    testar-api.sh  → teste documentado com curl
render.yaml Atalho opcional para criar os serviços no Render
```

## API

| Método | Rota                         | O que faz                                   |
|--------|------------------------------|---------------------------------------------|
| GET    | `/api/health/`               | Testa a API e a conexão com o banco         |
| GET    | `/api/tasks/`                | Lista tarefas (`?status=pending\|in_progress\|done`) |
| POST   | `/api/tasks/`                | Cria uma tarefa                             |
| GET    | `/api/tasks/<id>/`           | Detalha uma tarefa                          |
| PUT/PATCH | `/api/tasks/<id>/`        | Atualiza uma tarefa                         |
| DELETE | `/api/tasks/<id>/`           | Remove uma tarefa                           |

Campos da tarefa: `title`, `description`, `status` (`pending`, `in_progress`, `done`), `responsible`, e os automáticos `id`, `created_at`, `updated_at` e `completed_at` (preenchido quando a tarefa vira `done` — será a base do evento "tarefa concluída" no Módulo 4).

## Rodando localmente

Requisitos: Python 3.12+ e Node 20.19+ (ou 22.12+).

**Backend** (usa SQLite automaticamente se `DATABASE_URL` não estiver definida e `DEBUG=True`):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export DEBUG=True                  # Windows (PowerShell): $env:DEBUG="True"
python manage.py migrate
python manage.py runserver         # http://localhost:8000/api/
```

Para testar com o PostgreSQL do Neon localmente, defina também `DATABASE_URL` (veja `backend/.env.example`).

**Frontend:**

```bash
cd frontend
npm install
npm start                          # http://localhost:4200
```

---

# Como hospedar no Render (passo a passo)

Tudo abaixo é gratuito e **não exige cartão de crédito**. Os nomes de botões e menus dos sites podem mudar um pouco com o tempo, mas a lógica é a mesma.

Ordem: **GitHub → Neon (banco) → Render (backend) → Render (frontend) → ajuste de CORS**.

## Passo 1 — Colocar o código no GitHub

O Render faz o deploy puxando o código do GitHub, então o projeto precisa estar lá.

1. Crie uma conta em <https://github.com> e um repositório novo (ex.: `tarefas-distribuidas`), **sem** README/.gitignore (o projeto já tem).
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "Módulo 1: API de tarefas + frontend"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tarefas-distribuidas.git
git push -u origin main
```

O `.gitignore` já impede que `.env`, `node_modules` e outros arquivos sensíveis ou pesados subam.

## Passo 2 — Criar o banco PostgreSQL gratuito no Neon

1. Crie a conta em <https://neon.com> (login com GitHub, Google ou e-mail, sem cartão).
2. **Create project**: dê um nome (ex.: `tarefas`), mantenha a versão do PostgreSQL sugerida e escolha uma região **próxima à do backend no Render** (ex.: Render em _Virginia (US East)_ → Neon em _AWS US East (N. Virginia)_). Isso reduz a latência.
3. Na tela do projeto, clique em **Connect**. Em _Connection string_, **desative a opção "Connection pooling"** (conexão direta, a mais simples para o Django) e copie a string completa. Ela tem este formato:

```
postgresql://USUARIO:SENHA@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

   Essa string inteira será o valor da variável **`DATABASE_URL`** no próximo passo. Trate-a como uma senha: não coloque no código nem no GitHub.

> As tabelas **não** precisam ser criadas à mão: o comando `migrate`, executado no build do Render, cria tudo.
>
> O Neon "suspende" o banco após alguns minutos sem uso e o reativa sozinho na próxima consulta (leva cerca de 1 segundo). Os dados não se perdem.

**Quer usar outro PostgreSQL?** Qualquer um serve, basta colocar a connection string dele em `DATABASE_URL`:
- **Render Postgres** (New + → PostgreSQL → plano Free): copie a _Internal Database URL_. Só pode haver **um** banco gratuito por conta, e ele **expira em 30 dias**.
- **Aiven PostgreSQL** (plano Free, sem cartão e sem expiração): copie a _Service URI_. Em _Allowed IP addresses_ deixe `0.0.0.0/0`, porque o Render gratuito não tem IP fixo.

## Passo 3 — Publicar o backend (Django) no Render

1. Crie a conta em <https://render.com> usando **Sign in with GitHub** e autorize o acesso ao repositório.
2. **New + → Web Service** → escolha o repositório → **Connect**.
3. Preencha:

| Campo             | Valor                                  |
|-------------------|----------------------------------------|
| Name              | `tarefas-api` (vira parte da URL)      |
| Language          | `Python 3`                             |
| Branch            | `main`                                 |
| Root Directory    | `backend`                              |
| Build Command     | `bash build.sh`                        |
| Start Command     | `gunicorn config.wsgi:application`     |
| Instance Type     | **Free**                               |

4. Em **Environment Variables** (ou _Advanced → Add Environment Variable_), adicione:

| Chave                  | Valor                                                                 |
|------------------------|-----------------------------------------------------------------------|
| `PYTHON_VERSION`       | `3.12.8`                                                              |
| `DEBUG`                | `False`                                                               |
| `SECRET_KEY`           | uma string longa e aleatória (gere com `python -c "import secrets; print(secrets.token_urlsafe(50))"`) |
| `DATABASE_URL`         | a connection string do Neon (Passo 2), inteira                        |
| `CORS_ALLOWED_ORIGINS` | por enquanto `http://localhost:4200` (ajustamos no Passo 5)           |

   Em _Advanced_, defina **Health Check Path** como `/api/health/`.

5. Clique em **Create Web Service**. Acompanhe os logs: o build instala as dependências, roda `collectstatic` e `migrate` (cria as tabelas no Neon) e inicia o `gunicorn`. Quando aparecer **Live**, anote a URL (ex.: `https://tarefas-api.onrender.com`).
6. Teste no navegador: `https://tarefas-api.onrender.com/api/health/` deve mostrar `{"status":"ok","database":"postgresql"}`. Se aparecer `postgresql`, a API está conectada ao banco do Neon.

> **Por que o `migrate` está no build?** O _Pre-Deploy Command_ do Render (onde normalmente ficariam as migrações) é recurso de plano pago. Colocar no `build.sh` funciona igual no plano gratuito.

## Passo 4 — Publicar o frontend (Angular) no Render

1. **New + → Static Site** → mesmo repositório → **Connect**.
2. Preencha:

| Campo              | Valor                          |
|--------------------|--------------------------------|
| Name               | `tarefas-frontend`             |
| Branch             | `main`                         |
| Root Directory     | `frontend`                     |
| Build Command      | `npm ci && npm run build`      |
| Publish Directory  | `dist/frontend/browser`        |

3. Em **Environment Variables**:

| Chave          | Valor                                              |
|----------------|----------------------------------------------------|
| `NODE_VERSION` | `22.12.0`                                          |
| `API_URL`      | `https://tarefas-api.onrender.com/api` (a URL do **seu** backend, terminando em `/api`, sem barra no final) |

   O script `scripts/set-env.js` lê `API_URL` antes do build e grava no código do Angular — assim nenhuma URL fica fixa no repositório.

4. **Create Static Site** e aguarde o deploy. Anote a URL (ex.: `https://tarefas-frontend.onrender.com`).

## Passo 5 — Liberar o frontend no CORS do backend

O navegador só deixa o frontend chamar a API se o backend permitir a origem dele.

1. No Render, abra o serviço **tarefas-api → Environment**.
2. Altere `CORS_ALLOWED_ORIGINS` para a URL do frontend, **sem barra no final**: `https://tarefas-frontend.onrender.com`.
3. Salve. O Render reinicia o serviço sozinho.
4. Abra o frontend: já deve listar e criar tarefas. 🎉

## Passo 6 — Testar a API publicamente (evidência para a entrega)

```bash
bash scripts/testar-api.sh https://tarefas-api.onrender.com
```

O script faz health check, cria, lista, atualiza, filtra, deleta e valida um erro 400. Tire **prints** da saída (ou use Postman com as mesmas rotas) — é o "teste documentado" que o trabalho pede. No Windows, rode o script pelo Git Bash ou WSL.

## Atalho opcional: Blueprint (`render.yaml`)

O arquivo `render.yaml` da raiz descreve os dois serviços. Em **New + → Blueprint**, selecione o repositório e o Render cria tudo, pedindo apenas os valores marcados como secretos (`DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `API_URL`). Como a URL do backend só existe depois que ele é criado, você ainda precisará preencher `API_URL` e `CORS_ALLOWED_ORIGINS` e fazer um novo deploy. Os serviços usam o plano gratuito; confira na tela de confirmação se nenhum aparece com valor mensal antes de aceitar.

---

## Limitações do plano gratuito (importante para a demonstração)

- **O backend "dorme"** após ~15 minutos sem receber requisições. A primeira chamada depois disso pode levar cerca de 1 minuto. O frontend avisa isso na tela de carregamento. **Antes de gravar o vídeo ou apresentar, abra a URL do `/api/health/` e espere responder.**
- **O banco do Neon** é suspenso quando fica sem uso e reativa sozinho na próxima consulta; os dados ficam preservados. Se você optar pelo PostgreSQL do **Render**, lembre que ele expira em 30 dias.
- O plano gratuito do Render tem limite de horas mensais de instância; para um trabalho de faculdade é suficiente.
- Nunca coloque senhas ou a `SECRET_KEY` no código: tudo está em variáveis de ambiente, configuradas no painel (requisito do Módulo 1).

## Problemas comuns

| Sintoma | Causa provável e solução |
|---------|--------------------------|
| Build do backend falha em `migrate` com erro de conexão | `DATABASE_URL` copiada incompleta ou com a opção de pooling/senha errada (copie de novo no Neon). Corrija em _Environment_ e use **Manual Deploy → Deploy latest commit**. |
| `DisallowedHost` ou `Bad Request (400)` ao abrir a API | O host não está permitido. No Render isso é automático; se usar domínio próprio, defina `ALLOWED_HOSTS`. |
| Frontend carrega, mas mostra erro de API / console com "CORS" | `CORS_ALLOWED_ORIGINS` diferente da URL real do frontend (confira `https`, sem barra final). |
| Frontend chama `localhost:8000` em produção | `API_URL` não foi definida **antes** do build. Defina e faça **Clear build cache & deploy**. |
| `/api/health/` responde `sqlite` | `DATABASE_URL` não está definida no ambiente de produção. |
| Build do frontend falha por versão do Node | Confirme `NODE_VERSION=22.12.0` (ou superior na linha 22). |

## Checklist de entrega — Módulo 1

- [ ] Repositório Git com código-fonte e este `README.md`
- [ ] URL pública da API e do frontend no topo do README
- [ ] Variáveis de ambiente configuradas no painel (sem segredos no código)
- [ ] Prints ou saída do `scripts/testar-api.sh` rodando contra a URL pública
- [ ] Vídeo curto no YouTube (**não listado**) com o link no README
- [ ] Tag do Git para a entrega: `git tag entrega-1-cloud && git push origin entrega-1-cloud`
- [ ] `CHANGELOG.md` atualizado

## Próximos módulos

Este repositório já está organizado para evoluir: no **Módulo 2** o backend será dividido em pelo menos três microsserviços, no **Módulo 3** cada um ganhará um `Dockerfile` e haverá um `docker-compose.yml`, e no **Módulo 4** o evento "tarefa concluída" será publicado no RabbitMQ.
