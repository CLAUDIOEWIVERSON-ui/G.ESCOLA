const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const printStart = '{/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}';
const startIndex = content.lastIndexOf(printStart);
// Find the closing of DashboardPage
const endIndex = content.indexOf('    </div>\n  );\n}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  // Go back to the spaces
  const startToCut = content.lastIndexOf('\n', startIndex) + 1;
  let block = content.substring(startToCut, endIndex);
  
  block = block.replace('              </>\n', '');
  
  let newBlock = `      {selectedCard === 'exterior' && (\n` + block + `      )}\n`;
  content = content.substring(0, startToCut) + newBlock + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Fixed");
} else {
  console.log("Could not find blocks", startIndex, endIndex);
}
