const fs = require('fs');
const file = 'app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add handleToggleArchive
const functionToAdd = `
  const handleToggleArchive = async (id: string, archive: boolean) => {
    try {
      setRefreshing(true);
      const { error } = await supabase.from('turmas').update({ arquivada: archive }).eq('id', id);
      if (error) throw error;
      toast.success(language === 'pt' 
        ? (archive ? 'Turma arquivada com sucesso!' : 'Turma desarquivada com sucesso!') 
        : (archive ? 'Class archived successfully!' : 'Class unarchived successfully!'));
      refreshData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao arquivar turma');
      setRefreshing(false);
    }
  };
`;

if (!content.includes('handleToggleArchive')) {
  content = content.replace('const handleOpenModal = (turma: any = null) => {', functionToAdd + '\n  const handleOpenModal = (turma: any = null) => {');
}

// 2. Add 'arquivadas' to category
if (!content.includes("'arquivadas'")) {
  content = content.replace(
    `const activeCategory = (categoryParam && ['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'].includes(categoryParam)) `,
    `const activeCategory = (categoryParam && ['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', 'arquivadas'].includes(categoryParam)) `
  ).replace(
    `: (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior') `,
    `: (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior' | 'arquivadas') `
  );
}

// 3. Update category buttons map
if (!content.includes("['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', 'arquivadas']")) {
  content = content.replace(
    `(const).map((cat) =>`,
    `'arquivadas'] as const).map((cat) =>`
  ).replace(
    `(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'] as`,
    `(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior', `
  );
}

// 4. Update the translation part
content = content.replace(
  `{t.classes[\`category\${cat.charAt(0).toUpperCase() + cat.slice(1)}\` as keyof typeof t.classes]}`,
  `{cat === 'arquivadas' ? (language === 'pt' ? 'Arquivadas' : 'Archived') : t.classes[\`category\${cat.charAt(0).toUpperCase() + cat.slice(1)}\` as keyof typeof t.classes]}`
);

// 5. Update filter logic
if (!content.includes("if (!t.arquivada) return false;")) {
  content = content.replace(
    `const filteredTurmas = turmas.filter((t: any) => {`,
    `const filteredTurmas = turmas.filter((t: any) => {
    if (activeCategory === 'arquivadas') {
      if (!t.arquivada) return false;
    } else {
      if (t.arquivada) return false;
    }`
  );
}

// 6. Add buttons
if (!content.includes("handleToggleArchive(turma.id")) {
  const buttonsStr = `
                  {turma.status === 'concluída' && !turma.arquivada && (
                    <button 
                      onClick={() => handleToggleArchive(turma.id, true)}
                      className="p-2 bg-slate-100 hover:bg-slate-600 hover:text-white text-slate-600 rounded-xl border border-slate-200/50 shadow-xs transition-all duration-250 cursor-pointer flex items-center justify-center font-bold"
                      title={language === 'pt' ? 'Arquivar Turma' : 'Archive Class'}
                    >
                      <LayersIcon size={13} strokeWidth={2.5} />
                    </button>
                  )}
                  {turma.arquivada && (
                    <button 
                      onClick={() => handleToggleArchive(turma.id, false)}
                      className="p-2 bg-slate-100 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-xl border border-slate-200/50 shadow-xs transition-all duration-250 cursor-pointer flex items-center justify-center font-bold"
                      title={language === 'pt' ? 'Desarquivar Turma' : 'Unarchive Class'}
                    >
                      <RefreshCcw size={13} strokeWidth={2.5} />
                    </button>
                  )}
                  <button 
`;
  content = content.replace(
    /<button \s*onClick=\{\(\) => handleOpenModal\(turma\)\}/g,
    buttonsStr.trim() + '\n                    onClick={() => handleOpenModal(turma)}'
  );
}

fs.writeFileSync(file, content);
console.log('Done');
