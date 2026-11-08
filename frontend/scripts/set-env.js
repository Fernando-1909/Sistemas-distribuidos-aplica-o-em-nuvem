// Executado antes do build. No Render, defina as variáveis de ambiente do Static Site:
//   TASKS_API_URL    (ex.: https://tarefas-api.onrender.com/api)
//   USERS_API_URL    (ex.: https://tarefas-users.onrender.com/api)
//   PROJECTS_API_URL (ex.: https://tarefas-projects.onrender.com/api)
// Localmente, nada muda: usa localhost nas portas 8000, 8001 e 8002.
const fs = require('fs');
const path = require('path');

const clean = (value, fallback) => (value || fallback).replace(/\/+$/, '');

const tasksUrl = clean(process.env.TASKS_API_URL || process.env.API_URL, 'http://localhost:8000/api');
const usersUrl = clean(process.env.USERS_API_URL, 'http://localhost:8001/api');
const projectsUrl = clean(process.env.PROJECTS_API_URL, 'http://localhost:8002/api');

const file = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
fs.writeFileSync(
  file,
  `// Gerado por scripts/set-env.js\nexport const environment = {\n  tasksUrl: '${tasksUrl}',\n  usersUrl: '${usersUrl}',\n  projectsUrl: '${projectsUrl}',\n};\n`,
);
console.log(`[set-env] tasks=${tasksUrl} users=${usersUrl} projects=${projectsUrl}`);
