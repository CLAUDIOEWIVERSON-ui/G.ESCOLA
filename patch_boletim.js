const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/boletim/page.tsx', 'utf8');

const target = `                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].period}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal">
                                        {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                                         reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                                         reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                                      </span>
                                    </div>`;

const replacement = `                                    <div className="col-span-1 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{reportT[language as "pt" | "en"].period}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal">
                                        {reportData.classObj?.periodo === 'manhã' ? t.common.morning :
                                         reportData.classObj?.periodo === 'tarde' ? t.common.afternoon :
                                         reportData.classObj?.periodo === 'noite' ? t.common.night : reportData.classObj?.periodo}
                                      </span>
                                    </div>
                                    <div className="col-span-4 flex flex-col gap-0.5 mt-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-none">{language === 'pt' ? 'Período de Realização' : 'Class Period'}</span>
                                      <span className="text-[10px] font-extrabold text-slate-850 uppercase tracking-wide mt-1 leading-normal font-mono">
                                        {reportData.classObj?.data_inicio ? reportData.classObj.data_inicio.split('-').reverse().join('/') : '—'} {language === 'pt' ? 'a' : 'to'} {reportData.classObj?.data_fim ? reportData.classObj.data_fim.split('-').reverse().join('/') : '—'}
                                      </span>
                                    </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('app/(dashboard)/boletim/page.tsx', content);
