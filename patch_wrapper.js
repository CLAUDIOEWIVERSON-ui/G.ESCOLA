const fs = require('fs');
const path = '/app/applet/app/(dashboard)/relatorio-avaliacao/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = '<div className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:space-y-2 print:py-0 print:px-0 print:max-w-none ">';
const replacement = '<div className={`max-w-7xl mx-auto px-4 py-8 space-y-8 print:space-y-2 print:py-0 print:px-0 print:max-w-none ${printMode === "bw" ? "print:grayscale" : ""}`}>';

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(path, code);
  console.log('Patched wrapper!');
} else {
  console.log('Target not found!');
}
