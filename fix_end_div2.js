const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const lastParen = content.lastIndexOf(');');
content = content.substring(0, lastParen) + '  </div>\n  ' + content.substring(lastParen);

fs.writeFileSync(file, content);
