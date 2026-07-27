const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const leftover = `              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                {t.dashboard.studentsAbroad}
              </h3>
              <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                {alunosExterior.length} {language === 'pt' ? 'Alunos' : 'Students'}
              </span>
            </div>`;

content = content.replace(leftover, "");

fs.writeFileSync(file, content);
