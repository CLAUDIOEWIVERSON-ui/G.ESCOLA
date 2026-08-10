const fs = require('fs');

const file = 'components/StudentDetailEditModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes("navalMissionLogo")) {
  content = content.replace(
    "import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';",
    "import militaryFemaleAvatar from '@/src/assets/images/avatar_military_female_1779964903107.png';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';\nimport { format } from 'date-fns';"
  );
}

// 2. Add turmaInfo state
if (!content.includes("const [turmaInfo, setTurmaInfo]")) {
  content = content.replace(
    "const [isAdmin, setIsAdmin] = useState(false);",
    "const [isAdmin, setIsAdmin] = useState(false);\n  const [turmaInfo, setTurmaInfo] = useState<any>(null);"
  );
}

// 3. Add loadTurmaInfo helper and update useEffect
if (!content.includes("loadTurmaInfo")) {
  const loadTurmaCode = `  const loadTurmaInfo = async (tId?: string) => {
    if (!tId) {
      setTurmaInfo(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('turmas')
        .select('nome, codigo')
        .eq('id', tId)
        .maybeSingle();
      if (data) setTurmaInfo(data);
      else setTurmaInfo(null);
    } catch (err) {
      console.error('Error loading turma info:', err);
    }
  };
`;

  content = content.replace(
    "const loadAttendance = async (studentId?: string) => {",
    `${loadTurmaCode}\n  const loadAttendance = async (studentId?: string) => {`
  );

  content = content.replace(
    "loadStudentAccess(aluno.id);",
    "loadStudentAccess(aluno.id);\n      loadTurmaInfo(aluno.turma_id || turmaId);"
  );

  content = content.replace(
    "setStudentAccess(null);",
    "setStudentAccess(null);\n      loadTurmaInfo(turmaId);"
  );
}

// 4. Update form className to include print:hidden
content = content.replace(
  '<form onSubmit={handleSaveStudent} className="space-y-6 max-h-[82vh] overflow-y-auto px-1">',
  '<form onSubmit={handleSaveStudent} className="space-y-6 max-h-[82vh] overflow-y-auto px-1 print:hidden">'
);

// 5. Inject Printable Ficha Individual before </Modal>
const printableComponent = `
      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL DOCUMENT: FICHA INDIVIDUAL DO ALUNO */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-slate-900 bg-white p-2 font-sans text-xs w-full">
        {/* Cabeçalho Institucional */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 relative shrink-0">
              <Image
                src={navalMissionLogo}
                alt="Brasão"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-600 leading-tight">
                SISTEMA DE GESTÃO ESCOLAR E ACADÊMICA
              </h1>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                ESCOLA DE FORMAÇÃO E APERFEIÇOAMENTO MILITAR
              </h2>
              <p className="text-xs font-extrabold text-blue-900 uppercase tracking-widest mt-0.5">
                FICHA INDIVIDUAL DO ALUNO
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] space-y-1 shrink-0">
            <div className="font-mono bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-bold text-slate-900">
              MATRÍCULA: {currentAluno?.matricula || 'N/A'}
            </div>
            <div className="font-mono text-slate-600">
              Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border border-slate-400 bg-slate-50">
              SITUAÇÃO: {currentAluno?.status?.toUpperCase() || 'ATIVO'}
            </div>
          </div>
        </div>

        {/* Perfil do Aluno: Foto 3x4 + Identificadores Principais */}
        <div className="grid grid-cols-12 gap-3 border border-slate-400 rounded-lg p-3 mb-4 bg-slate-50/50">
          {/* Foto 3x4 */}
          <div className="col-span-3 flex flex-col items-center justify-center border-r border-slate-300 pr-3">
            <div className="w-28 h-36 border-2 border-slate-800 rounded bg-white overflow-hidden relative shadow-sm">
              {currentAluno?.foto_url ? (
                <img
                  src={currentAluno.foto_url}
                  alt={currentAluno.nome || 'Foto do Aluno'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={getAvatarImage()}
                  alt="Foto do Aluno"
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">FOTO 3x4 OFICIAL</span>
          </div>

          {/* Identificação do Aluno */}
          <div className="col-span-9 grid grid-cols-2 gap-2 text-xs">
            <div className="col-span-2 border-b border-slate-200 pb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Nome Completo</span>
              <span className="text-sm font-black text-slate-900 uppercase">{currentAluno?.nome || 'NÃO INFORMADO'}</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Nome de Guerra / Apelido</span>
              <span className="font-bold text-slate-800 uppercase">{currentAluno?.nome_guerra || '-'}</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Posto / Graduação</span>
              <span className="font-bold text-slate-800 uppercase">{currentAluno?.posto_graduacao || '-'}</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Categoria / Tipo</span>
              <span className="font-bold text-slate-800 uppercase">{currentAluno?.tipo_aluno || 'Militar'}</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Organização Militar (OM)</span>
              <span className="font-bold text-slate-800 uppercase">{currentAluno?.om || '-'}</span>
            </div>

            <div className="col-span-2 border-t border-slate-200 pt-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Turma / Curso</span>
              <span className="font-bold text-blue-900 uppercase">
                {turmaInfo?.nome ? \`\${turmaInfo.nome} \${turmaInfo.codigo ? \`(\${turmaInfo.codigo})\` : ''}\` : 'Turma Geral'}
              </span>
            </div>
          </div>
        </div>

        {/* Seção 1: Dados Pessoais e Documentação Civil */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
            1. DADOS PESSOAIS E DOCUMENTAÇÃO CIVIL
          </h3>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Gênero:</td>
                <td className="p-1.5 w-1/4 border-r border-slate-300 capitalize">{currentAluno?.genero || '-'}</td>
                <td className="p-1.5 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Data de Nascimento:</td>
                <td className="p-1.5 w-1/4 font-mono">{currentAluno?.data_nascimento ? format(new Date(currentAluno.data_nascimento), 'dd/MM/yyyy') : '-'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">RG:</td>
                <td className="p-1.5 font-mono border-r border-slate-300">{currentAluno?.rg || '-'}</td>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Título de Eleitor:</td>
                <td className="p-1.5 font-mono">{currentAluno?.titulo_eleitor || '-'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Nome do Pai:</td>
                <td className="p-1.5 uppercase border-r border-slate-300" colSpan={3}>{currentAluno?.nome_pai || '-'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Nome da Mãe:</td>
                <td className="p-1.5 uppercase border-r border-slate-300" colSpan={3}>{currentAluno?.nome_mae || '-'}</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Ano de Admissão:</td>
                <td className="p-1.5 font-mono border-r border-slate-300">{currentAluno?.ano_admissao || '-'}</td>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Função / Cargo:</td>
                <td className="p-1.5 uppercase">{currentAluno?.funcao || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Seção 2: Contato e Comunicação */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
            2. CONTATO E COMUNICAÇÃO
          </h3>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 font-bold bg-slate-100 w-1/6 border-r border-slate-300">E-mail:</td>
                <td className="p-1.5 font-mono w-2/6 border-r border-slate-300">{currentAluno?.email || '-'}</td>
                <td className="p-1.5 font-bold bg-slate-100 w-1/6 border-r border-slate-300">Telefone:</td>
                <td className="p-1.5 font-mono w-2/6">{currentAluno?.telefone || '-'}</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">WhatsApp:</td>
                <td className="p-1.5 font-mono border-r border-slate-300">{currentAluno?.whatsapp || '-'}</td>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Código de Acesso:</td>
                <td className="p-1.5 font-mono font-bold text-blue-900">{studentAccess?.access_code || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Seção 3: Registro de Frequência e Assiduidade */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
            3. REGISTRO DE FREQUÊNCIA E ASSIDUIDADE
          </h3>
          <table className="w-full border-collapse border border-slate-300 text-xs text-center">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-1.5 border-r border-slate-300">Total de Aulas</th>
                <th className="p-1.5 border-r border-slate-300">Presenças (%)</th>
                <th className="p-1.5 border-r border-slate-300">Faltas (%)</th>
                <th className="p-1.5">Situação da Frequência</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1.5 font-mono border-r border-slate-300">{attendanceStats.total} aulas</td>
                <td className="p-1.5 font-mono font-bold text-emerald-800 border-r border-slate-300">
                  {attendanceStats.presentes} ({attendanceStats.percentPresenca}%)
                </td>
                <td className="p-1.5 font-mono font-bold text-rose-800 border-r border-slate-300">
                  {attendanceStats.faltas} ({attendanceStats.percentFalta}%)
                </td>
                <td className="p-1.5 font-bold uppercase">
                  {attendanceStats.total === 0 ? (
                    <span className="text-slate-500">SEM REGISTROS</span>
                  ) : attendanceStats.percentPresenca >= 75 ? (
                    <span className="text-emerald-700">REGULAR (&ge; 75%)</span>
                  ) : (
                    <span className="text-rose-700">ABAIXO DO EXIGIDO (&lt; 75%)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Seção 4: Observações Pedagógicas */}
        <div className="mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-t">
            4. OBSERVAÇÕES PEDAGÓGICAS E DISCIPLINARES
          </h3>
          <div className="border border-slate-300 p-2.5 text-xs font-sans min-h-[50px] bg-slate-50/30">
            {currentAluno?.observacoes ? (
              <p className="whitespace-pre-wrap leading-relaxed">{currentAluno.observacoes}</p>
            ) : (
              <p className="text-slate-400 italic">Nenhuma observação ou anotação disciplinar cadastrada até a presente data.</p>
            )}
          </div>
        </div>

        {/* Termo de Assinaturas */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-800 w-4/5 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800 uppercase">{currentAluno?.nome || 'Aluno'}</p>
            <p className="text-[9px] text-slate-500 uppercase">Assinatura do Aluno</p>
          </div>
          <div>
            <div className="border-b border-slate-800 w-4/5 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800 uppercase">Secretaria Acadêmica / Comando</p>
            <p className="text-[9px] text-slate-500 uppercase">Carimbo e Assinatura</p>
          </div>
        </div>
      </div>
    </Modal>
`;

if (!content.includes("PRINT-ONLY OFFICIAL DOCUMENT")) {
  content = content.replace("</Modal>", printableComponent);
}

fs.writeFileSync(file, content);
console.log("Successfully updated StudentDetailEditModal.tsx");
