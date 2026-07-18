const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const target = `            {!currentTurma?.internacional && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.startDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_inicio || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_inicio: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.endDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_fim || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_fim: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.postponedDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_postergacao || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_postergacao: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>
              </>
            )}`;

const replacement = `                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.startDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_inicio || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_inicio: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.endDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_fim || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_fim: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.classes.postponedDate}</label>
                  <input
                    type="date"
                    value={currentTurma?.data_postergacao || ''}
                    onChange={(e) => setCurrentTurma({ ...currentTurma, data_postergacao: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
