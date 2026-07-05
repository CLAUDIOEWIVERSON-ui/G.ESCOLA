const fs = require('fs');
const path = './app/(dashboard)/notas/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const [selectedTurma, setSelectedTurma] = useState('');",
  "  const [selectedTurma, setSelectedTurma] = useState('');\n  const [selectedDisciplina, setSelectedDisciplina] = useState('');"
);

content = content.replace(
  "      if (discData) {\n        setDisciplinas(discData);\n      }",
  "      if (discData) {\n        setDisciplinas(discData);\n        if (discData.length > 0 && !discData.find((d: any) => d.id === selectedDisciplina)) {\n          setSelectedDisciplina(discData[0].id);\n        }\n      }"
);

content = content.replace(
  "    const targetDisciplinaId = disciplinas[0].id; // Use first discipline as main container",
  "    const targetDisciplinaId = selectedDisciplina || disciplinas[0]?.id; // Use selected discipline"
);

content = content.replace(
  "    const targetDisciplinaId = disciplinas[0].id;\n    const aluno = turmaAlunos.find(a => a.id === alunoId);",
  "    const targetDisciplinaId = selectedDisciplina || disciplinas[0]?.id;\n    const aluno = turmaAlunos.find(a => a.id === alunoId);"
);

content = content.replace(
  '            </select>\n          </div>\n        </div>',
  '            </select>\n          </div>\n\n          <div className="space-y-2">\n            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === \'pt\' ? \'Disciplina\' : \'Discipline\'}</label>\n            <select\n              value={selectedDisciplina}\n              onChange={(e) => setSelectedDisciplina(e.target.value)}\n              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium"\n              disabled={disciplinas.length === 0}\n            >\n              {disciplinas.map((d: any) => (\n                <option key={d.id} value={d.id}>{d.nome}</option>\n              ))}\n            </select>\n          </div>\n        </div>'
);

content = content.replace(
  '        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">',
  '        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">'
);

// We also need to fix `const fdId = disciplinas[0]?.id;` in the map functions
content = content.replace(
  /const fdId = disciplinas\[0\]\?\.id;/g,
  "const fdId = selectedDisciplina || disciplinas[0]?.id;"
);
content = content.replace(
  /const firstDiscId = disciplinas\[0\]\.id;/g,
  "const firstDiscId = selectedDisciplina || disciplinas[0]?.id;"
);

fs.writeFileSync(path, content, 'utf8');
