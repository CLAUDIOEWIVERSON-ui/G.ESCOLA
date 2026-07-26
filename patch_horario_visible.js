const fs = require('fs');
const path = './app/(dashboard)/horario/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<div className="hidden print:flex items-center gap-4 mb-8">',
  '<div className="flex items-center gap-4 mb-8">'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched horario/page.tsx visibility");
