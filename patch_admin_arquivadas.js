const fs = require('fs');
const file = 'app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', 'arquivadas'] as const).map((cat) => (",
  "(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', ...(isAdmin ? ['arquivadas'] : [])] as const).map((cat) => ("
);

content = content.replace(
  "grid-cols-7 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-[720px]",
  "grid-cols-6 xl:grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-auto min-w-[620px]"
);

fs.writeFileSync(file, content);
console.log('Done patch_admin_arquivadas');
