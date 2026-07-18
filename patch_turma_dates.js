const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

content = content.replace(
  `        data_inicio: currentTurma.internacional ? null : (typeof currentTurma.data_inicio === 'string' ? currentTurma.data_inicio.trim() || null : null),
        data_fim: currentTurma.internacional ? null : (typeof currentTurma.data_fim === 'string' ? currentTurma.data_fim.trim() || null : null),
        data_postergacao: currentTurma.internacional ? null : (typeof currentTurma.data_postergacao === 'string' ? currentTurma.data_postergacao.trim() || null : null),`,
  `        data_inicio: typeof currentTurma.data_inicio === 'string' ? currentTurma.data_inicio.trim() || null : null,
        data_fim: typeof currentTurma.data_fim === 'string' ? currentTurma.data_fim.trim() || null : null,
        data_postergacao: typeof currentTurma.data_postergacao === 'string' ? currentTurma.data_postergacao.trim() || null : null,`
);

content = content.replace(/{!currentTurma\?\.internacional && \(\s*<>\s*(<div>\s*<label[^>]*>\{t\.classes\.startDate\}<\/label>\s*<input[^>]*data_inicio[^>]*>\s*<\/div>\s*<div>\s*<label[^>]*>\{t\.classes\.endDate\}<\/label>\s*<input[^>]*data_fim[^>]*>\s*<\/div>\s*<div>\s*<label[^>]*>\{t\.classes\.postponedDate\}<\/label>\s*<input[^>]*data_postergacao[^>]*>\s*<\/div>)\s*<\/>\s*\)}/g, '$1');

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
