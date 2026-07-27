const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('      )}\n      );\n}', '      )}\n    </div>\n  );\n}');

fs.writeFileSync(file, content);
