const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

content = content.replace(
`  const filteredTurmas = turmas.filter((t: any) => {
    if (q) {`,
`  const filteredTurmas = turmas.filter((t: any) => {
    if (t.status === 'pré-inscrito(a)(s)') return false;
    
    if (q) {`
);

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
