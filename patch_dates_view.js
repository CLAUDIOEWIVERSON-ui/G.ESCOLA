const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const target1 = `                      {isCiabaOrCiaga && (aluno.data_inicio_curso || aluno.data_fim_curso) && (
                        <div className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {language === 'pt' ? 'Curso: ' : 'Course: '}
                          <span className="font-mono text-blue-900">
                            {aluno.data_inicio_curso ? aluno.data_inicio_curso.split('-').reverse().join('/') : '—'}
                          </span>
                          {' a '}
                          <span className="font-mono text-blue-900">
                            {aluno.data_fim_curso ? aluno.data_fim_curso.split('-').reverse().join('/') : '—'}
                          </span>
                        </div>
                      )}`;
content = content.replace(target1, '');

const target2 = `                                {isCiabaOrCiaga && (student.data_inicio_curso || student.data_fim_curso) && (
                                  <span className="text-[6px] text-neutral-500 font-extrabold normal-case mt-0.5 whitespace-nowrap overflow-hidden block">
                                    {language === 'pt' ? 'período: ' : 'period: '}
                                    <span className="font-mono text-black">
                                      {student.data_inicio_curso ? student.data_inicio_curso.split('-').reverse().join('/') : '—'}
                                    </span>
                                    {' a '}
                                    <span className="font-mono text-black">
                                      {student.data_fim_curso ? student.data_fim_curso.split('-').reverse().join('/') : '—'}
                                    </span>
                                  </span>
                                )}`;
content = content.replace(target2, '');

const saveTarget = `      if (isCiabaOrCiaga) {
        if (currentAluno.data_inicio_curso !== undefined) {
          dataToSave.data_inicio_curso = currentAluno.data_inicio_curso ? currentAluno.data_inicio_curso : null;
        }
        if (currentAluno.data_fim_curso !== undefined) {
          dataToSave.data_fim_curso = currentAluno.data_fim_curso ? currentAluno.data_fim_curso : null;
        }
      } else {
        dataToSave.data_inicio_curso = null;
        dataToSave.data_fim_curso = null;
      }`;
content = content.replace(saveTarget, `      dataToSave.data_inicio_curso = null;
      dataToSave.data_fim_curso = null;`);

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
