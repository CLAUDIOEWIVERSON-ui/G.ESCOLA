const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/cursos/page.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { useState, useEffect, useCallback } from 'react';",
  "import { useState, useEffect, useCallback } from 'react';\nimport { useSearchParams, useRouter, usePathname } from 'next/navigation';"
);

// 2. Add activeGroup logic
const activeCategoryLine = "  const [activeCategory, setActiveCategory] = useState<string | null>(null);";

const groupLogic = `  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const groupParam = searchParams ? searchParams.get('group') : null;
  const activeGroup = (groupParam && ['GAT', 'MAN'].includes(groupParam.toUpperCase())) ? groupParam.toUpperCase() : 'GAT';

  const setActiveGroup = (grp: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('group', grp);
    router.push(\`\${pathname}?\${params.toString()}\`);
    setCurrentPage(1);
  };
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);`;

code = code.replace(activeCategoryLine, groupLogic);

// 3. Update filteredCursos
const filterLogic = `  const filteredCursos = cursos.filter((c: any) => {
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase());`;

const newFilterLogic = `  const filteredCursos = cursos.filter((c: any) => {
    if (c.grupo_responsavel && c.grupo_responsavel !== activeGroup && c.grupo_responsavel !== 'AMBOS') {
      return false;
    }
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase());`;

code = code.replace(filterLogic, newFilterLogic);

// 4. Update UI layout
const oldUi = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Cursos Category Buttons */}
          <div className="flex flex-wrap items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 gap-1">`;

const newUi = `<div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full xl:w-auto">
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

          {/* Cursos Category Buttons */}
          <div className="flex flex-wrap items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 gap-1">`;

code = code.replace(oldUi, newUi);

// 5. When opening new modal, default to activeGroup
const openModalNew = `  const handleOpenModal = () => {
    setEditingCurso(null);
    reset({
      nome: '',
      codigo: '',
      descricao: '',
      duracao: 1,
      duracao_unidade: 'ano',
      ativo: true,
      qtd_modulos: 4,
      categoria: null,
      internacional: false,
      localizacao: '',
      grupo_responsavel: null,
      documento_criacao: null
    });
    setIsModalOpen(true);
  };`;

const newOpenModal = `  const handleOpenModal = () => {
    setEditingCurso(null);
    reset({
      nome: '',
      codigo: '',
      descricao: '',
      duracao: 1,
      duracao_unidade: 'ano',
      ativo: true,
      qtd_modulos: 4,
      categoria: null,
      internacional: false,
      localizacao: '',
      grupo_responsavel: activeGroup,
      documento_criacao: null
    });
    setIsModalOpen(true);
  };`;

code = code.replace(openModalNew, newOpenModal);

fs.writeFileSync('app/(dashboard)/cursos/page.tsx', code);
console.log("Updated cursos page");
