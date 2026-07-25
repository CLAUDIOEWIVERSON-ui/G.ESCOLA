const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const oldCourses = `{cursos.map((curso: any) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} {curso.codigo ? \`(\${curso.codigo})\` : ''}
                  </option>
                ))}`;

const newCourses = `{cursos.filter((c: any) => !c.grupo_responsavel || c.grupo_responsavel === activeGroup || c.grupo_responsavel === 'AMBOS').map((curso: any) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} {curso.codigo ? \`(\${curso.codigo})\` : ''}
                  </option>
                ))}`;

code = code.replace(oldCourses, newCourses);
fs.writeFileSync('app/(dashboard)/turmas/page.tsx', code);
console.log("Updated courses mapping");
