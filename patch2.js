const fs = require('fs');
const file = 'app/(dashboard)/boletim/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("statusClass = 'text-emerald-600 font-extrabold';", "statusClass = 'text-emerald-700 bg-emerald-50/50 font-extrabold';");
content = content.replace("statusClass = 'text-orange-600 font-extrabold';", "statusClass = 'text-orange-700 bg-orange-50/50 font-extrabold';");
content = content.replace("statusClass = 'text-yellow-600 font-extrabold';", "statusClass = 'text-amber-700 bg-amber-50/50 font-extrabold';");
content = content.replace("statusClass = 'text-rose-600 font-extrabold';", "statusClass = 'text-rose-700 bg-rose-50/50 font-extrabold';");
// Also we need to remove bg-white from the statusClass td so the background shows through
content = content.replace('className={cn("px-4 py-3 text-right font-black bg-white align-middle break-words whitespace-normal leading-tight border-b border-slate-200", row.statusClass)}', 'className={cn("px-4 py-3 text-right font-black align-middle break-words whitespace-normal leading-tight border-b border-slate-200", row.statusClass)}');
fs.writeFileSync(file, content, 'utf8');
console.log('Patched 2');
