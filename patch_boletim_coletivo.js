const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/boletim/page.tsx', 'utf8');

const target = `                                   <div className="flex flex-col gap-0.5">
                                     <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'ANO' : 'YEAR'}</span>
                                     <span className="text-xs font-mono font-black text-slate-800 mt-1 leading-tight">
                                       {selectedAno || turmas.find((t: any) => t.id === selectedTurma)?.ano || new Date().getFullYear()}
                                     </span>
                                   </div>
                                 </div>`;

const replacement = `                                   <div className="flex flex-col gap-0.5">
                                     <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'ANO' : 'YEAR'}</span>
                                     <span className="text-xs font-mono font-black text-slate-800 mt-1 leading-tight">
                                       {selectedAno || turmas.find((t: any) => t.id === selectedTurma)?.ano || new Date().getFullYear()}
                                     </span>
                                   </div>
                                   <div className="col-span-4 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'Período de Realização' : 'Class Period'}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal font-mono">
                                        {turmas.find((t: any) => t.id === selectedTurma)?.data_inicio ? turmas.find((t: any) => t.id === selectedTurma)?.data_inicio.split('-').reverse().join('/') : '—'} {language === 'pt' ? 'a' : 'to'} {turmas.find((t: any) => t.id === selectedTurma)?.data_fim ? turmas.find((t: any) => t.id === selectedTurma)?.data_fim.split('-').reverse().join('/') : '—'}
                                      </span>
                                    </div>
                                 </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('app/(dashboard)/boletim/page.tsx', content);
