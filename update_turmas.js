const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

// 1. Add activeGroup logic
const activeCatLogic = `  const activeCategory = (categoryParam && ['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'].includes(categoryParam)) 
    ? (categoryParam as 'all' | 'expedito' | 'especial' | 'carreira' | 'ead' | 'exterior') 
    : 'all';

  const setActiveCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('cat', cat);
    router.push(\`\${pathname}?\${params.toString()}\`);
    setCurrentPage(1);
  };`;

const groupLogic = `  const groupParam = searchParams ? searchParams.get('group') : null;
  const activeGroup = (groupParam && ['GAT', 'MAN'].includes(groupParam.toUpperCase())) ? groupParam.toUpperCase() : 'GAT';

  const setActiveGroup = (grp: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('group', grp);
    router.push(\`\${pathname}?\${params.toString()}\`);
    setCurrentPage(1);
  };
  
${activeCatLogic}`;

code = code.replace(activeCatLogic, groupLogic);

// 2. Update filtering
const filterLogic = `  const filteredTurmas = turmas.filter((t: any) => {
    if (q) {
      const nomeMatch = t.nome?.toLowerCase().includes(q);
      const cursoMatch = t.curso?.nome?.toLowerCase().includes(q);
      const instrutorMatch = t.instrutor?.toLowerCase().includes(q);
      if (!nomeMatch && !cursoMatch && !instrutorMatch) {
        return false;
      }
    }`;

const newFilterLogic = `  const filteredTurmas = turmas.filter((t: any) => {
    const finalGroup = t.grupo_responsavel || t.curso?.grupo_responsavel;
    if (finalGroup !== activeGroup) {
      return false;
    }
    
    if (q) {
      const nomeMatch = t.nome?.toLowerCase().includes(q);
      const cursoMatch = t.curso?.nome?.toLowerCase().includes(q);
      const instrutorMatch = t.instrutor?.toLowerCase().includes(q);
      if (!nomeMatch && !cursoMatch && !instrutorMatch) {
        return false;
      }
    }`;

code = code.replace(filterLogic, newFilterLogic);

// 3. UI Update
const uiLogic = `<div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-[620px]">`;

const newUiLogic = `<div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            {['GAT', 'MAN'].map((grp) => (
              <button
                key={grp}
                onClick={() => setActiveGroup(grp)}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeGroup === grp
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {grp}
              </button>
            ))}
          </div>

          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden xl:block" />

          <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-[620px]">`;

code = code.replace(uiLogic, newUiLogic);

// Fix flex layout
code = code.replace('<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">', '<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">');

// 4. Default creating logic
const createLogic = `    setCurrentTurma(turma || { 
      nome: '', 
      curso_id: '', 
      categoria: activeCategory === 'all' ? 'expedito' : (activeCategory === 'exterior' ? 'expedito' : activeCategory),
      ano: new Date().getFullYear(), 
      periodo: 'manhã', 
      capacidade_max: 40, 
      instrutor: '', 
      status: 'ativa',
      data_inicio: '',
      data_fim: '',
      data_postergacao: '',
      internacional: activeCategory === 'exterior',
      localizacao: '',
      liberar_formularios: false
    });`;

const newCreateLogic = `    setCurrentTurma(turma || { 
      nome: '', 
      curso_id: '', 
      categoria: activeCategory === 'all' ? 'expedito' : (activeCategory === 'exterior' ? 'expedito' : activeCategory),
      ano: new Date().getFullYear(), 
      periodo: 'manhã', 
      capacidade_max: 40, 
      instrutor: '', 
      status: 'ativa',
      data_inicio: '',
      data_fim: '',
      data_postergacao: '',
      internacional: activeCategory === 'exterior',
      localizacao: '',
      grupo_responsavel: activeGroup,
      liberar_formularios: false
    });`;

code = code.replace(createLogic, newCreateLogic);

fs.writeFileSync('app/(dashboard)/turmas/page.tsx', code);
console.log("Updated app/(dashboard)/turmas/page.tsx");
