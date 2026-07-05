const fs = require('fs');
const path = './app/(dashboard)/boletim/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /let computedFinal = null;\s*const validFinals = studentGrades\s*\.map\(\(g: any\) => g\.nota_final\)\s*\.filter\(\(val: any\) => val !== null && val !== undefined && val !== ''\)\s*\.map\(\(val: any\) => Number\(val\)\);\s*if \(validFinals\.length > 0\) \{\s*computedFinal = validFinals\.reduce\(\(a: number, b: number\) => a \+ b, 0\) \/ validFinals\.length;\s*\} else \{/g;

const replacement = `let computedFinal = existingGrade.nota_final;
          if (computedFinal === null || computedFinal === undefined) {`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
