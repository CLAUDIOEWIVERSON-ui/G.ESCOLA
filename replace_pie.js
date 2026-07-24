const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

const regex = /const pieData = \[\s*\{ name: 'Excelente \(\★5\)', value: distribution\[5\], color: '#10b981' \},\s*\{ name: 'Bom \(\★4\)', value: distribution\[4\], color: '#06b6d4' \},\s*\{ name: 'Regular \(\★3\)', value: distribution\[3\], color: '#f59e0b' \},\s*\{ name: 'Insatisfeito \(\★1-2\)', value: \(distribution\[1\] \|\| 0\) \+ \(distribution\[2\] \|\| 0\), color: '#ef4444' \}\s*\]\.filter\(item => item\.value > 0\);/;

const replacement = `const pieData = [
  { name: 'Conc. Plenamente (★5)', value: distribution[5], color: '#10b981' },
  { name: 'Conc. Parcialmente (★4)', value: distribution[4], color: '#06b6d4' },
  { name: 'Neutro/Regular (★3)', value: distribution[3], color: '#f59e0b' },
  { name: 'Discordo (★1-2)', value: (distribution[1] || 0) + (distribution[2] || 0), color: '#ef4444' }
].filter(item => item.value > 0);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
  console.log('Replaced pie labels');
} else {
  console.log('Pie labels regex did not match');
}
