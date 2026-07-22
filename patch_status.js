const fs = require('fs');
const file = 'hooks/useCachedData.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /turma:turmas!inner\(\s*id,\s*nome,\s*ano,\s*data_inicio,\s*data_fim,\s*internacional,\s*localizacao,/g,
  "turma:turmas!inner(\n              id,\n              nome,\n              ano,\n              data_inicio,\n              data_fim,\n              status,\n              internacional,\n              localizacao,"
);

fs.writeFileSync(file, code);
console.log('status patched in useCachedData.ts');
