const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

const regex = /const getScaleLabel = \(val: number\) => \{\s*if \(val >= 4\.2\) return "Concordância Plena \(CP\)";\s*if \(val >= 2\.6\) return "Concordância Parcial \(CPa\)";\s*return "Discordo \/ Não se Aplica \(D\/NA\)";\s*\};/;

const replacement = `const getScaleLabel = (val: number) => {
  if (val >= 4.2) return "Concordo Plenamente";
  if (val >= 2.6) return "Concordo Parcialmente";
  return "Discordo / Não se Aplica";
};`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
  console.log('Replaced scale labels');
} else {
  console.log('Scale regex did not match');
}
