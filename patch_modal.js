const fs = require('fs');
let code = fs.readFileSync('components/StudentDetailEditModal.tsx', 'utf8');

// Insert after data_nascimento
const extraFields = `
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'RG' : 'ID Document (RG)'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.rg || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, rg: e.target.value })}
                      placeholder="RG"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Organização Militar (OM)' : 'Military Organization'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.om || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, om: e.target.value })}
                      placeholder="OM"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Título de Eleitor' : 'Voter Title'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.titulo_eleitor || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, titulo_eleitor: e.target.value })}
                      placeholder="Título de Eleitor"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Ano de Admissão' : 'Admission Year'}
                    </label>
                    <input
                      type="number"
                      value={currentAluno?.ano_admissao || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, ano_admissao: e.target.value })}
                      placeholder="Ex: 2024"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Nome do Pai' : 'Father Name'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.nome_pai || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, nome_pai: e.target.value })}
                      placeholder="Nome do Pai"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Nome da Mãe' : 'Mother Name'}
                    </label>
                    <input
                      type="text"
                      value={currentAluno?.nome_mae || ''}
                      onChange={(e) => setCurrentAluno({ ...currentAluno, nome_mae: e.target.value })}
                      placeholder="Nome da Mãe"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    />
                  </div>`;

// Find where to insert
const searchStr = `                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'pt' ? 'Função / Cargo' : 'Role / Function'}
                    </label>`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, extraFields + '\n\n' + searchStr);
  fs.writeFileSync('components/StudentDetailEditModal.tsx', code);
  console.log('Patched modal successfully');
} else {
  console.log('Could not find injection point');
}
