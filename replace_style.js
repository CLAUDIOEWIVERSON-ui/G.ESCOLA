const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

const newStyle = `<style>{\`
  @media print {
    /* Absolute force to white */
    html, body, main, #__next, .min-h-screen, .flex-1 {
      background-color: #FFFFFF !important;
      background: #FFFFFF !important;
    }
    
    /* Make backgrounds transparent except specific progress bars */
    * {
      background-color: transparent !important;
      color: #000000 !important;
    }
    
    .bg-emerald-500 { background-color: #10b981 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-purple-500 { background-color: #a855f7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-cyan-500 { background-color: #06b6d4 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-rose-500 { background-color: #f43f5e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-rose-400 { background-color: #fb7185 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-amber-500 { background-color: #f59e0b !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-blue-500 { background-color: #3b82f6 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-slate-800 { background-color: #334155 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    
    .text-emerald-500 { color: #10b981 !important; }
    .text-purple-500 { color: #a855f7 !important; }
    .text-cyan-500 { color: #06b6d4 !important; }
    .text-rose-500 { color: #f43f5e !important; }
    .text-amber-500 { color: #f59e0b !important; }
    .text-blue-500 { color: #3b82f6 !important; }
    .text-slate-400 { color: #64748b !important; }
    
    /* Allow printing backgrounds globally */
    :root {
      color-scheme: light !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
\`}</style>`;

const regex = /<style>\{`([\s\S]*?)`\}<\/style>/;
if (regex.test(code)) {
  code = code.replace(regex, newStyle);
  fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
  console.log('Replaced style');
} else {
  console.log('Regex did not match');
}
