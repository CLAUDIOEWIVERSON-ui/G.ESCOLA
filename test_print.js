const fs = require('fs');
const path = './app/(dashboard)/relatorio-avaliacao/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.includes("MISSÃO DE ASSESSORIA NAVAL")) {
    console.log("Header applied correctly.");
}
