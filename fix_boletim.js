const fs = require('fs');
const path = './app/(dashboard)/boletim/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        if (existingGrade) {
          let computedFinal = null;
          const validFinals = studentGrades
            .map((g: any) => g.nota_final)
            .filter((val: any) => val !== null && val !== undefined && val !== '')
            .map((val: any) => Number(val));
                      
          if (validFinals.length > 0) {
            computedFinal = validFinals.reduce((a: number, b: number) => a + b, 0) / validFinals.length;
          } else {
            const scores: number[] = [];
            for (let i = 1; i <= localCourseModules; i++) {
              const val = existingGrade[\`nota\${i}\`];
              if (val !== null && val !== undefined && val !== '') {
                scores.push(Number(val));
              }
            }
            if (scores.length > 0) {
              computedFinal = scores.reduce((x, y) => x + y, 0) / scores.length;
            }
          }`;

const replacement = `        if (existingGrade) {
          let computedFinal = existingGrade.nota_final;
          
          if (computedFinal === null || computedFinal === undefined) {
            const scores: number[] = [];
            for (let i = 1; i <= localCourseModules; i++) {
              const val = existingGrade[\`nota\${i}\`];
              if (val !== null && val !== undefined && val !== '') {
                scores.push(Number(val));
              }
            }
            if (scores.length > 0) {
              computedFinal = scores.reduce((x, y) => x + y, 0) / scores.length;
            }
          }`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
