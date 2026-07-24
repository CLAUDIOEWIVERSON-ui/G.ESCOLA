const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

const regex = /<style>\{`([\s\S]*?)`\}<\/style>/;
if (regex.test(code)) {
  let existingStyle = code.match(regex)[1];
  
  // Add the specific bg-slate-900 progress bar rule if it's not there
  if (!existingStyle.includes('div.bg-slate-900')) {
    const specificRules = `
    div.bg-slate-900.h-full.rounded-full,
    div.h-full.bg-slate-900.rounded-full {
      background-color: #0f172a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    `;
    
    // insert right before the closing bracket of the media print block or just append inside
    existingStyle = existingStyle.replace('/* Allow printing backgrounds globally */', specificRules + '\n    /* Allow printing backgrounds globally */');
    
    code = code.replace(regex, '<style>{`' + existingStyle + '`}</style>');
    fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
    console.log('Updated style with specific bg-slate-900 rules');
  } else {
    console.log('Rule already exists');
  }
} else {
  console.log('Regex did not match');
}
