const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the first occurrence of <div className="space-y-6">
content = content.replace('<div className="space-y-6">', '<>\n      <div className="space-y-6 print:hidden">');

// Replace the LAST </div>
// Find last index of </div>
const lastDivIndex = content.lastIndexOf('</div>');
content = content.substring(0, lastDivIndex) + '</div>\n    </>' + content.substring(lastDivIndex + 6);

fs.writeFileSync(file, content);
