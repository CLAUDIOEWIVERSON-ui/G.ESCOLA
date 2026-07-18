const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

// 1. Remove from ALUNO edit form
const formTarget = `          {isCiabaOrCiaga && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
              <div>
                <label className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-1">
                  {language === 'pt' ? 'Início do Curso' : 'Course Start Date'}
                </label>
                <input
                  type="date"
                  value={currentAluno?.data_inicio_curso || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, data_inicio_curso: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 text-blue-900 rounded text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-1">
                  {language === 'pt' ? 'Término do Curso' : 'Course End Date'}
                </label>
                <input
                  type="date"
                  value={currentAluno?.data_fim_curso || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, data_fim_curso: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 text-blue-900 rounded text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                />
              </div>
            </div>
          )}`;
content = content.replace(formTarget, '');

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
