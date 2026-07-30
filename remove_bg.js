const fs = require('fs');
const file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'isPreInscrito ? "bg-red-50 hover:bg-red-100/80" : "hover:bg-slate-50"',
  '"hover:bg-slate-50"'
);

content = content.replace(
  'isPreInscrito ? "bg-red-50 hover:bg-red-100/80" : "hover:bg-slate-50"',
  '"hover:bg-slate-50"'
);

fs.writeFileSync(file, content);
console.log('Done');
