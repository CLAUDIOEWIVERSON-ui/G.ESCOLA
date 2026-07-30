const fs = require('fs');
const file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// For Turmas Table:
content = content.replace(
  '<div className={cn("font-bold", isPreInscrito ? "text-red-600" : "text-slate-800")}>{turma.nome}</div>',
  '<div className={cn("font-bold", isPreInscrito ? "text-red-600" : "text-slate-800")}>{turma.nome}</div>'
); // Already there

// Let's replace the other spans/divs in the Turmas row
content = content.replace(
  '<div className="text-[10px] text-slate-400 font-mono uppercase">\n                      ANO: {turma.ano || \'-\'} {turma.grupo_responsavel ? `• GRUPO: ${turma.grupo_responsavel}` : \'\'}\n                    </div>',
  '<div className={cn("text-[10px] font-mono uppercase", isPreInscrito ? "text-red-500" : "text-slate-400")}>\n                      ANO: {turma.ano || \'-\'} {turma.grupo_responsavel ? `• GRUPO: ${turma.grupo_responsavel}` : \'\'}\n                    </div>'
);

content = content.replace(
  '<div className="text-slate-650 font-medium">{turma.curso?.nome || \'-\'}</div>',
  '<div className={cn("font-medium", isPreInscrito ? "text-red-600" : "text-slate-650")}>{turma.curso?.nome || \'-\'}</div>'
);

content = content.replace(
  '<span className="font-bold whitespace-nowrap">\n                        {turma.data_inicio ? turma.data_inicio.split(\'-\').reverse().join(\'/\') : \'—\'}\n                      </span>',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>\n                        {turma.data_inicio ? turma.data_inicio.split(\'-\').reverse().join(\'/\') : \'—\'}\n                      </span>'
);
content = content.replace(
  '<span className="font-bold whitespace-nowrap">\n                        {turma.data_fim ? turma.data_fim.split(\'-\').reverse().join(\'/\') : \'—\'}\n                      </span>',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>\n                        {turma.data_fim ? turma.data_fim.split(\'-\').reverse().join(\'/\') : \'—\'}\n                      </span>'
);

content = content.replace(
  '<span className="text-slate-600 font-bold">\n                      {turma.inscritos?.[0]?.count || 0}\n                    </span>',
  '<span className={cn("font-bold", isPreInscrito ? "text-red-600" : "text-slate-600")}>\n                      {turma.inscritos?.[0]?.count || 0}\n                    </span>'
);

content = content.replace(
  '<span className="text-[10px] text-slate-400 font-bold">\n                      / {turma.capacidade_max || 40} {isPt ? \'vagas\' : \'seats\'}\n                    </span>',
  '<span className={cn("text-[10px] font-bold", isPreInscrito ? "text-red-400" : "text-slate-400")}>\n                      / {turma.capacidade_max || 40} {isPt ? \'vagas\' : \'seats\'}\n                    </span>'
);

content = content.replace(
  '<div className="text-slate-650 font-medium">{turma.instrutor || \'-\'}</div>',
  '<div className={cn("font-medium", isPreInscrito ? "text-red-600" : "text-slate-650")}>{turma.instrutor || \'-\'}</div>'
);

fs.writeFileSync(file, content);
console.log('Done patch_dashboard_red_all');
