const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const searchMap = `{cursos.map((curso: any) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} {curso.codigo ? \`(\${curso.codigo})\` : ''}
                  </option>
                ))}`;

const replaceMap = `{cursos.filter((c: any) => !c.grupo_responsavel || c.grupo_responsavel === activeGroup || c.grupo_responsavel === 'AMBOS').map((curso: any) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} {curso.codigo ? \`(\${curso.codigo})\` : ''}
                  </option>
                ))}`;

if (code.includes(searchMap)) {
  code = code.replace(searchMap, replaceMap);
  fs.writeFileSync('app/(dashboard)/turmas/page.tsx', code);
  console.log("Updated cursos map");
} else {
  console.log("Could not find searchMap");
}
