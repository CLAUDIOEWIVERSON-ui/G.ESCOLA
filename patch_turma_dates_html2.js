const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

content = content.replace(/{!currentTurma\?\.internacional && \(\s*<>/g, '');
content = content.replace(/                <\/div>\s*<\/>\s*\)\}/g, '                </div>');

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
