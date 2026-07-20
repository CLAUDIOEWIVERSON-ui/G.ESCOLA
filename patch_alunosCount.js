const fs = require('fs');
const pathData = '/app/applet/hooks/useCachedData.ts';
let codeData = fs.readFileSync(pathData, 'utf8');

codeData = codeData.replace(
  /const tWithCourse = \{ \.\.\.t, curso: course \};/g,
  `const tWithCourse = { ...t, curso: course, alunosCount };`
);

fs.writeFileSync(pathData, codeData);

const pathUI = '/app/applet/app/(dashboard)/dashboard/page.tsx';
let codeUI = fs.readFileSync(pathUI, 'utf8');

// Replace the {turma.capacidade_max || 40} vagas with {turma.alunosCount} alunos
codeUI = codeUI.replace(
  /\{turma\.capacidade_max \|\| 40\} \{isPt \? 'vagas' : 'seats'\}/g,
  `{turma.alunosCount || 0} {isPt ? 'alunos' : 'students'} / {turma.capacidade_max || 40} {isPt ? 'vagas' : 'seats'}`
);

fs.writeFileSync(pathUI, codeUI);
