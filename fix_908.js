const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const badBlock = "{selectedCard === 'exterior' && (\n            <></div>\n            )}";
content = content.replace(badBlock, "");

fs.writeFileSync(file, content);
