const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetHeader = `<div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">`;
const replacementHeader = `<div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  {t.dashboard.studentsAbroad}
                </h3>
                <span className="text-xs text-slate-550 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50 ml-2">
                  {alunosExterior.length} {language === 'pt' ? 'Alunos' : 'Students'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors shadow-sm border border-blue-200"
              >
                <Printer size={14} />
                {language === 'pt' ? 'Imprimir' : 'Print'}
              </button>
            </div>`;

content = content.replace(targetHeader, replacementHeader);

const motionDivEndForExterior = `            )}
          </motion.div>
        )}

        {selectedCard === 'expedito' && (`;

const printLayout = `            )}
            
            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-visible">
              <style dangerouslySetInnerHTML={{__html: \`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 15mm;
                  }
                  html, body {
                    background: white !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .print-exterior-container, .print-exterior-container * {
                    visibility: visible;
                  }
                  .print-exterior-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                  }
                }
              \`}} />
              <div className="print-exterior-container text-black font-sans w-full max-w-full">
                <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 relative">
                  <div className="absolute left-0 top-0">
                    <Image
                      src={navalMissionLogo}
                      alt="Logo Missão de Assessoria Naval"
                      width={64}
                      height={64}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                      priority
                    />
                  </div>
                  <h1 className="text-xl font-extrabold uppercase tracking-tight text-center mt-2">
                    {language === 'pt' ? 'MISSÃO DE ASSESSORIA NAVAL' : 'NAVAL ADVISORY MISSION'}
                  </h1>
                  <h2 className="text-lg font-bold uppercase tracking-wide text-center mt-1">
                    {language === 'pt' ? 'ALUNOS NO EXTERIOR' : 'STUDENTS ABROAD'}
                  </h2>
                </div>
                
                <table className="w-full text-left border-collapse border border-black mb-4">
                  <thead>
                    <tr className="border-b border-black bg-gray-100">
                      <th className="p-2 border-r border-black font-bold uppercase text-[11px]">{t.students.name}</th>
                      <th className="p-2 border-r border-black font-bold uppercase text-[11px]">{t.dashboard.courseLocation}</th>
                      <th className="p-2 font-bold uppercase text-[11px] text-center">{t.dashboard.startEnd}</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {alunosExterior.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center italic border-b border-black">
                          {t.common.noInternationalStudents}
                        </td>
                      </tr>
                    ) : (
                      alunosExterior.map((aluno, idx) => {
                        const turmaData = Array.isArray(aluno.turma) ? aluno.turma[0] : aluno.turma;
                        const curso = Array.isArray(turmaData?.curso) ? turmaData.curso[0] : turmaData?.curso;
                        return (
                          <tr key={\`print-ext-\${aluno.id || idx}\`} className="border-b border-black">
                            <td className="p-2 border-r border-black">
                              <div className="font-bold">
                                {aluno.posto_graduacao ? \`\${aluno.posto_graduacao} \` : ''}{aluno.nome}
                              </div>
                              <div className="text-[9px] uppercase mt-0.5">
                                {aluno.om || '-'}
                              </div>
                            </td>
                            <td className="p-2 border-r border-black">
                              <div className="font-bold">{curso?.nome || '-'}</div>
                              <div className="text-[9px] uppercase mt-0.5">{turmaData?.localizacao || '-'}</div>
                            </td>
                            <td className="p-2 text-center align-middle border-black">
                              {turmaData?.internacional ? (
                                <div>
                                  <span className="font-bold whitespace-nowrap">
                                    {aluno.data_inicio_curso?.trim() ? aluno.data_inicio_curso.split('-').reverse().join('/') : (turmaData?.data_inicio?.trim() ? turmaData.data_inicio.split('-').reverse().join('/') : '—')}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold mx-1">a</span>
                                  <span className="font-bold whitespace-nowrap">
                                    {aluno.data_fim_curso?.trim() ? aluno.data_fim_curso.split('-').reverse().join('/') : (turmaData?.data_fim?.trim() ? turmaData.data_fim.split('-').reverse().join('/') : '—')}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold whitespace-nowrap">
                                    {turmaData?.data_inicio ? turmaData.data_inicio.split('-').reverse().join('/') : '—'}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold mx-1">a</span>
                                  <span className="font-bold whitespace-nowrap">
                                    {turmaData?.data_fim ? turmaData.data_fim.split('-').reverse().join('/') : '—'}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div className="text-[9px] text-right">
                  {language === 'pt' ? 'Gerado em' : 'Generated on'} {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {selectedCard === 'expedito' && (`;

content = content.replace(motionDivEndForExterior, printLayout);
fs.writeFileSync(file, content);
