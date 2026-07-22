const fs = require('fs');
const file = 'app/(dashboard)/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\{aluno\.data_inicio_curso \? aluno\.data_inicio_curso\.split\('-\'\)\.reverse\(\)\.join\('\/'\) \: \(turmaData\?\.data_inicio \? turmaData\.data_inicio\.split\('-\'\)\.reverse\(\)\.join\('\/'\) \: '—'\)\}/g,
  "{aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}"
);

code = code.replace(
  /\{aluno\.data_fim_curso \? aluno\.data_fim_curso\.split\('-\'\)\.reverse\(\)\.join\('\/'\) \: \(turmaData\?\.data_fim \? turmaData\.data_fim\.split\('-\'\)\.reverse\(\)\.join\('\/'\) \: '—'\)\}/g,
  "{aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}"
);

fs.writeFileSync(file, code);
console.log('patched');
