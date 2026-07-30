const fs = require('fs');
const dashboardFile = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(dashboardFile, 'utf8');

// Replace in print block
content = content.replace(
  'const fallbackUrlString = typeof fallbackSrc === \'string\' ? fallbackSrc : (fallbackSrc?.src || \'\');',
  'const fallbackUrlString = typeof fallbackSrc === \'string\' ? fallbackSrc : (fallbackSrc?.src || \'\');\n                    const isPreInscrito = turmaData?.status === \'pré-inscrito\';'
);

content = content.replace(
  '<tr key={`print-ext-${aluno.id || idx}`} className="border-b border-black">',
  '<tr key={`print-ext-${aluno.id || idx}`} className={cn("border-b border-black", isPreInscrito ? "text-red-700" : "")}>'
);

content = content.replace(
  '<div className="font-bold text-xs uppercase">\n                            {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : \'\'}{aluno.nome}\n                          </div>\n                          <div className="text-[9px] uppercase mt-0.5 text-slate-600 font-medium">',
  '<div className="font-bold text-xs uppercase">\n                            {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : \'\'}{aluno.nome}\n                          </div>\n                          <div className={cn("text-[9px] uppercase mt-0.5 font-medium", isPreInscrito ? "text-red-600" : "text-slate-600")}>'
);

content = content.replace(
  '<div className="text-[9px] uppercase mt-0.5 text-slate-600 font-medium">\n                            {turmaData?.nome ? `${turmaData.nome} • ` : \'\'}{turmaData?.localizacao || \'-\'}\n                          </div>',
  '<div className={cn("text-[9px] uppercase mt-0.5 font-medium", isPreInscrito ? "text-red-600" : "text-slate-600")}>\n                            {turmaData?.nome ? `${turmaData.nome} • ` : \'\'}{turmaData?.localizacao || \'-\'}\n                          </div>'
);

fs.writeFileSync(dashboardFile, content);
console.log('Done patch_print_red');
