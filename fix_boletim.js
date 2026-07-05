const fs = require('fs');
const path = './app/(dashboard)/boletim/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find existingGrade line
let startIdx = lines.findIndex(l => l.includes('let computedFinal = existingGrade.nota_final;'));
let endIdx = lines.findIndex(l => l.includes('let bestFreq = existingGrade.frequencia;'));

let newBlock = `          let computedFinal = existingGrade.nota_final;
          if (computedFinal === null || computedFinal === undefined) {
            const scores: number[] = [];
            for (let i = 1; i <= localCourseModules; i++) {
              const val = existingGrade[\`nota\${i}\`];
              if (val !== null && val !== undefined && val !== "") {
                scores.push(Number(val));
              }
            }
            if (scores.length > 0) {
              computedFinal = scores.reduce((x, y) => x + y, 0) / scores.length;
            }
          }
`;

lines.splice(startIdx, endIdx - startIdx, newBlock);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
