const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const target = `const payload = {
        nome: currentTurma.nome || '',
        curso_id: currentTurma.curso_id,
        categoria: currentTurma.categoria || 'expedito',
        ano: currentTurma.ano || new Date().getFullYear(),
        periodo: currentTurma.periodo || 'manhã',
        capacidade_max: currentTurma.capacidade_max || 40,
        instrutor: currentTurma.instrutor || '',
        status: currentTurma.status || 'ativa',
        ativa: (currentTurma.status || 'ativa') === 'ativa',`;

const replacement = `let dbStatus = currentTurma.status || 'ativa';
      let dbAtiva = dbStatus === 'ativa';
      if (dbStatus === 'pré-inscrito(a)(s)') {
        dbStatus = 'ativa';
        dbAtiva = false;
      }

      const payload = {
        nome: currentTurma.nome || '',
        curso_id: currentTurma.curso_id,
        categoria: currentTurma.categoria || 'expedito',
        ano: currentTurma.ano || new Date().getFullYear(),
        periodo: currentTurma.periodo || 'manhã',
        capacidade_max: currentTurma.capacidade_max || 40,
        instrutor: currentTurma.instrutor || '',
        status: dbStatus,
        ativa: dbAtiva,`;

content = content.replace(target, replacement);
fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
