const fs = require('fs');
const file = 'app/(dashboard)/relatorio-avaliacao/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = `                )}
              </div>
            </div>
          )}

          {/* TAB 2: RELATÓRIO DO CURSO */}`;

const newSection = `                )}
              </div>

              {/* Card List of Comments on the General Tab */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 print:block">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-slate-600" />
                    Comentários Escritos pelos Alunos
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sugestões, críticas, elogios e outras observações inseridas nas avaliações respondidas.
                  </p>
                </div>
                {filteredSubmissions.filter(s => s.sugestoes_melhoria || s.criticas_construtivas || s.elogios || s.necessidades_novos_cursos || s.comentarios_adicionais).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic text-xs font-mono">
                    📭 Nenhum comentário por escrito registrado nesta seleção.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredSubmissions.filter(s => s.sugestoes_melhoria || s.criticas_construtivas || s.elogios || s.necessidades_novos_cursos || s.comentarios_adicionais).map((sub, index) => {
                      const stud = allStudents.find(a => a.id === sub.aluno_id);
                      const studentName = stud ? stud.nome : (sub.aluno_nome || 'Aluno Desconhecido');
                      const posto = stud?.posto_graduacao || '';
                      
                      return (
                        <div key={\`comment-\${sub.id || index}\`} className="border border-slate-200 rounded-xl p-5 bg-slate-50 print:bg-transparent shadow-sm break-inside-avoid">
                          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wide">
                              {posto ? <span className="text-slate-500 mr-1">{posto}</span> : null}
                              {studentName}
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            {sub.sugestoes_melhoria && (
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sugestões de Melhoria</h4>
                                <p className="text-xs text-slate-700 bg-white print:bg-transparent p-3 rounded border border-slate-100">{sub.sugestoes_melhoria}</p>
                              </div>
                            )}
                            {sub.criticas_construtivas && (
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Críticas Construtivas</h4>
                                <p className="text-xs text-slate-700 bg-white print:bg-transparent p-3 rounded border border-slate-100">{sub.criticas_construtivas}</p>
                              </div>
                            )}
                            {sub.elogios && (
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Elogios</h4>
                                <p className="text-xs text-slate-700 bg-white print:bg-transparent p-3 rounded border border-slate-100">{sub.elogios}</p>
                              </div>
                            )}
                            {sub.necessidades_novos_cursos && (
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Necessidade de Novos Cursos</h4>
                                <p className="text-xs text-slate-700 bg-white print:bg-transparent p-3 rounded border border-slate-100">{sub.necessidades_novos_cursos}</p>
                              </div>
                            )}
                            {sub.comentarios_adicionais && (
                              <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comentários Adicionais</h4>
                                <p className="text-xs text-slate-700 bg-white print:bg-transparent p-3 rounded border border-slate-100">{sub.comentarios_adicionais}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RELATÓRIO DO CURSO */}`;

if (content.includes(anchor)) {
  content = content.replace(anchor, newSection);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully replaced Comments section in page.tsx");
} else {
  console.log("Anchor not found in page.tsx. Trying fallback.");
  const anchor2 = `                )}
              </div>

              {/* Card List of Comments on the General Tab */}`;
  if(content.includes(anchor2)) {
    console.log("Already replaced!");
  } else {
      console.log("Could not find any matching string to replace!");
  }
}
