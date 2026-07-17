const fs = require('fs');
let content = fs.readFileSync('hooks/useCachedData.ts', 'utf8');

const target = `      const activeCursos = cursosRes.data || [];
      const activeTurmas = turmasRes.data || [];
      const activeAlunos = alunosRes.data || [];`;

const replacement = `      const activeCursos = cursosRes.data || [];
      const activeTurmas = (turmasRes.data || []).map((t: any) => {
        if (t.status === 'ativa' && t.ativa === false) {
          return { ...t, status: 'pré-inscrito(a)(s)' };
        }
        return t;
      });
      const activeAlunos = alunosRes.data || [];`;

content = content.replace(target, replacement);
fs.writeFileSync('hooks/useCachedData.ts', content);
