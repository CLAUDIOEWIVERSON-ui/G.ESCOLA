const fs = require('fs');
const file = 'app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `? (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior')`,
  `? (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior' | 'arquivadas')`
);

fs.writeFileSync(file, content);
console.log('Done active category');
