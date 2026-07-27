const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('<>\n      <div className="space-y-6 print:hidden">', '<div className="space-y-6">');
content = content.replace('</div>\n    </>', '');

fs.writeFileSync(file, content);
