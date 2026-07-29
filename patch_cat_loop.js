const fs = require('fs');
const file = 'app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "grid-cols-6 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-[620px]",
  "grid-cols-7 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-[720px]"
);

content = content.replace(
  "(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'] as const).map((cat)",
  "(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', 'arquivadas'] as const).map((cat)"
);

fs.writeFileSync(file, content);
console.log('Done patch_cat_loop');
