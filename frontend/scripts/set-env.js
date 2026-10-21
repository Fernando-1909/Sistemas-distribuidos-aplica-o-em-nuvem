// Executado antes do build. No Render, defina a variável de ambiente API_URL
// (ex.: https://tarefas-api.onrender.com/api). Localmente, nada muda.
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');
const file = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');

fs.writeFileSync(
  file,
  `// Gerado por scripts/set-env.js\nexport const environment = {\n  apiUrl: '${apiUrl}',\n};\n`
);
console.log(`[set-env] apiUrl = ${apiUrl}`);
