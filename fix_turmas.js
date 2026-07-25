const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

code = code.replace(
  'if (finalGroup !== activeGroup) {',
  'if (finalGroup && finalGroup !== activeGroup && finalGroup !== "AMBOS") {'
);

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', code);
console.log("Fixed turmas AMBOS logic");
