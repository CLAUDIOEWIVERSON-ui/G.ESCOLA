const fs = require('fs');
const path = '/app/applet/hooks/useCachedData.ts';
let code = fs.readFileSync(path, 'utf8');

// Update isPreInscrito logic for alunos exterior
code = code.replace(
  /const isPreInscrito = statusLower\.includes\('pré-inscrit'\) \|\| statusLower\.includes\('pre-inscrit'\) \|\| \(statusLower === 'ativa' && tData\.ativa === false\) \|\| statusLower === 'pré-inscrito\(a\)\(s\)';/g,
  `const isPreInscrito = statusLower.includes('pré-inscrit') || statusLower.includes('pre-inscrit') || (statusLower === 'ativa' && tData.ativa === false) || statusLower === 'pré-inscrito(a)(s)' || (tData.nome && tData.nome.toLowerCase().includes('cefoma'));`
);

// Update isPreInscrito logic for activeCursos / turmas loop
code = code.replace(
  /const isPreInscrito = statusLower\.includes\('pré-inscrit'\) \|\| statusLower\.includes\('pre-inscrit'\) \|\| \(statusLower === 'ativa' && t\.ativa === false\) \|\| statusLower === 'pré-inscrito\(a\)\(s\)';/g,
  `const isPreInscrito = statusLower.includes('pré-inscrit') || statusLower.includes('pre-inscrit') || (statusLower === 'ativa' && t.ativa === false) || statusLower === 'pré-inscrito(a)(s)' || (t.nome && t.nome.toLowerCase().includes('cefoma'));`
);

// Update isPreInscrito logic for activeAlunos loop
code = code.replace(
  /const isPreInscrito = statusLower\.includes\('pré-inscrit'\) \|\| statusLower\.includes\('pre-inscrit'\) \|\| \(statusLower === 'ativa' && course\.ativa === false\) \|\| statusLower === 'pré-inscrito\(a\)\(s\)';/g,
  `const isPreInscrito = statusLower.includes('pré-inscrit') || statusLower.includes('pre-inscrit') || (statusLower === 'ativa' && course.ativa === false) || statusLower === 'pré-inscrito(a)(s)' || (course.nome && course.nome.toLowerCase().includes('cefoma'));`
);

fs.writeFileSync(path, code);
