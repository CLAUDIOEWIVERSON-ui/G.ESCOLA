const fs = require('fs');

// Patch turmas/page.tsx
const turmasFile = 'app/(dashboard)/turmas/page.tsx';
let turmasContent = fs.readFileSync(turmasFile, 'utf8');

turmasContent = turmasContent.replace(
  "turma.status === 'pré-inscrito' ? \"bg-cyan-50 text-cyan-600 border-cyan-100\" :",
  "turma.status === 'pré-inscrito' ? \"bg-red-50 text-red-600 border-red-100\" :"
);

turmasContent = turmasContent.replace(
  "<h3 className=\"text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors\">{turma.nome}</h3>",
  "<h3 className={cn(\"text-xl font-black tracking-tight leading-tight transition-colors\", turma.status === 'pré-inscrito' ? 'text-red-600 group-hover:text-red-700' : 'text-slate-800 group-hover:text-blue-600')}>{turma.nome}</h3>"
);

fs.writeFileSync(turmasFile, turmasContent);

// Patch dashboard/page.tsx
const dashboardFile = 'app/(dashboard)/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

dashboardContent = dashboardContent.replace(
  "<div className=\"font-bold text-slate-800\">\n                                  {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : ''}{aluno.nome}\n                                </div>",
  "<div className={cn(\"font-bold\", isPreInscrito ? \"text-red-600\" : \"text-slate-800\")}>\n                                  {aluno.posto_graduacao ? `${aluno.posto_graduacao} ` : ''}{aluno.nome}\n                                </div>"
);

dashboardContent = dashboardContent.replace(
  "<div className=\"font-bold text-slate-800\">{turma.nome}</div>",
  "<div className={cn(\"font-bold\", isPreInscrito ? \"text-red-600\" : \"text-slate-800\")}>{turma.nome}</div>"
);

fs.writeFileSync(dashboardFile, dashboardContent);

console.log('Done patch_red_font');
