const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

// 1. Identity Profile Card (2825)
code = code.replace(
  '<h3 className="text-base font-bold text-slate-900">{studentSub.aluno?.nome}</h3>',
  '<h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight shadow-sm px-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>{studentSub.aluno?.nome}</h3>'
);

// 2. Comentários section (2143, 2166)
code = code.replace(
  '<span className="text-[10px] text-emerald-700 block mt-1.5 font-bold font-mono">\n                              — {sub.aluno?.nome || "Aluno"} ({sub.aluno?.posto_graduacao || "Graduação"})\n                            </span>',
  '<span className="text-[10px] text-emerald-700 block mt-1.5 font-bold font-mono">\n                              — <span className="text-sm font-black text-emerald-950 uppercase">{sub.aluno?.nome || "Aluno"}</span> <span className="text-[10px]">({sub.aluno?.posto_graduacao || "Graduação"})</span>\n                            </span>'
);

code = code.replace(
  '<span className="text-[10px] text-rose-700 block mt-1.5 font-bold font-mono">\n                              — {sub.aluno?.nome || "Aluno"} ({sub.aluno?.posto_graduacao || "Graduação"})\n                            </span>',
  '<span className="text-[10px] text-rose-700 block mt-1.5 font-bold font-mono">\n                              — <span className="text-sm font-black text-rose-950 uppercase">{sub.aluno?.nome || "Aluno"}</span> <span className="text-[10px]">({sub.aluno?.posto_graduacao || "Graduação"})</span>\n                            </span>'
);

// 3. General Comentários Tab (2043-2046)
const oldGeneralComment = `<span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wide">
                              {posto ? <span className="text-slate-500 mr-1">{posto}</span> : null}
                              {studentName}
                            </span>`;
const newGeneralComment = `<span className="text-sm font-black text-slate-900 font-mono uppercase tracking-wide">
                              {posto ? <span className="text-xs text-slate-500 font-bold mr-1">{posto}</span> : null}
                              <span className="text-lg">{studentName}</span>
                            </span>`;
if (code.includes(oldGeneralComment)) {
  code = code.replace(oldGeneralComment, newGeneralComment);
}

// 4. Pendente (2758)
const oldPending = `O aluno <strong className="text-slate-900">{studentDetails?.nome || "Selecionado"}</strong> ({studentDetails?.posto_graduacao || "Posto/Graduação"}) ainda não enviou as respostas do questionário de conclusão.`;
const newPending = `O aluno <strong className="text-xl font-black text-slate-900 uppercase mx-1">{studentDetails?.nome || "Selecionado"}</strong> ({studentDetails?.posto_graduacao || "Posto/Graduação"}) ainda não enviou as respostas do questionário de conclusão.`;
if (code.includes(oldPending)) {
  code = code.replace(oldPending, newPending);
}

fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
console.log('Updated student names');
