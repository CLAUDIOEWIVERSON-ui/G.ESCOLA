const fs = require('fs');
const turmasFile = 'app/(dashboard)/turmas/page.tsx';
let turmasContent = fs.readFileSync(turmasFile, 'utf8');

turmasContent = turmasContent.replace(
  '<p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] truncate">{turma.curso?.nome}</p>',
  '<p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] truncate", turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-slate-400\')}>{turma.curso?.nome}</p>'
);

turmasContent = turmasContent.replace(
  '<span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-bold uppercase rounded border border-blue-100 flex-shrink-0 font-mono">',
  '<span className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border flex-shrink-0 font-mono", turma.status === \'pré-inscrito\' ? \'bg-red-50 text-red-700 border-red-100\' : \'bg-blue-50 text-blue-700 border-blue-100\')}>'
);

turmasContent = turmasContent.replace(
  '<div className="flex items-center gap-2 text-slate-500">\n                    <Calendar size={14} className="text-slate-300" />',
  '<div className={cn("flex items-center gap-2", turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-slate-500\')}>\n                    <Calendar size={14} className={turma.status === \'pré-inscrito\' ? \'text-red-400\' : \'text-slate-300\'} />'
);

turmasContent = turmasContent.replace(
  '<div className="flex items-center gap-2 text-slate-500">\n                    <Clock size={14} className="text-slate-300" />',
  '<div className={cn("flex items-center gap-2", turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-slate-500\')}>\n                    <Clock size={14} className={turma.status === \'pré-inscrito\' ? \'text-red-400\' : \'text-slate-300\'} />'
);

turmasContent = turmasContent.replace(
  '<div className="flex items-center gap-2 text-slate-500 col-span-2">\n                      <Calendar size={14} className="text-blue-500" />\n                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">',
  '<div className={cn("flex items-center gap-2 col-span-2", turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-slate-500\')}>\n                      <Calendar size={14} className={turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-blue-500\'} />\n                      <span className={cn("text-[10px] font-black uppercase tracking-wider", turma.status === \'pré-inscrito\' ? \'text-red-600\' : \'text-slate-700\')}>'
);

turmasContent = turmasContent.replace(
  '<div className="flex items-center gap-2 text-slate-500 col-span-2">\n                    <Users size={14} className="text-slate-300" />',
  '<div className={cn("flex items-center gap-2 col-span-2", turma.status === \'pré-inscrito\' ? \'text-red-500\' : \'text-slate-500\')}>\n                    <Users size={14} className={turma.status === \'pré-inscrito\' ? \'text-red-400\' : \'text-slate-300\'} />'
);

fs.writeFileSync(turmasFile, turmasContent);
console.log('Done patch_card_red');
