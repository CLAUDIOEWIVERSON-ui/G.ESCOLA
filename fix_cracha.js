const fs = require('fs');
const file = 'app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<h3>CARTEIRINHA DE ACESSO</h3>',
  '<h3 style="color: ${nameColor};">CARTEIRINHA DE ACESSO</h3>'
);

// We should also make the student name red if needed, or just the header
content = content.replace(
  '<p class="value">${studentName}</p>',
  '<p class="value" style="color: ${nameColor};">${studentName}</p>'
);

fs.writeFileSync(file, content);
console.log('Fixed cracha');
