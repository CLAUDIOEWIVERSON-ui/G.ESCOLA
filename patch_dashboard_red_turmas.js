const fs = require('fs');
const file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="text-slate-700 font-semibold">{turma.curso?.nome || \'-\'}</div>',
  '<div className={cn("font-semibold", isPreInscrito ? "text-red-600" : "text-slate-700")}>{turma.curso?.nome || \'-\'}</div>'
);

content = content.replace(
  '<div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">\n                      {turma.categoria || \'-\'}\n                    </div>',
  '<div className={cn("text-[10px] uppercase font-black tracking-wider", isPreInscrito ? "text-red-400" : "text-slate-400")}>\n                      {turma.categoria || \'-\'}\n                    </div>'
);

content = content.replace(
  '<div className="text-slate-700 font-semibold">{turma.localizacao || \'-\'}</div>',
  '<div className={cn("font-semibold", isPreInscrito ? "text-red-600" : "text-slate-700")}>{turma.localizacao || \'-\'}</div>'
);

content = content.replace(
  '<div className="text-[10px] text-slate-400 font-black uppercase tracking-wider capitalize">\n                      {turma.periodo === \'manhã\' ? isPt ? \'Manhã\' : \'Morning\' : \n                       turma.periodo === \'tarde\' ? isPt ? \'Tarde\' : \'Afternoon\' : \n                       turma.periodo === \'noite\' ? isPt ? \'Noite\' : \'Night\' : turma.periodo}\n                    </div>',
  '<div className={cn("text-[10px] font-black uppercase tracking-wider capitalize", isPreInscrito ? "text-red-400" : "text-slate-400")}>\n                      {turma.periodo === \'manhã\' ? isPt ? \'Manhã\' : \'Morning\' : \n                       turma.periodo === \'tarde\' ? isPt ? \'Tarde\' : \'Afternoon\' : \n                       turma.periodo === \'noite\' ? isPt ? \'Noite\' : \'Night\' : turma.periodo}\n                    </div>'
);

fs.writeFileSync(file, content);
console.log('Done patch_dashboard_red_turmas');
