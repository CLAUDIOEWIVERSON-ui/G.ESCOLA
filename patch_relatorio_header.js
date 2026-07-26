const fs = require('fs');
const path = './app/(dashboard)/relatorio-avaliacao/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add imports
if (!content.includes("import Image")) {
  content = content.replace(
    "import { useState",
    "import Image from 'next/image';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';\nimport { useState"
  );
}

// Replace print header
const targetOldHeader = `      {/* PRINT HEADER */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-2 mb-2">
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatório de Avaliações</h1>`;

const newHeader = `      {/* PRINT HEADER */}
      <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-slate-950 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center overflow-hidden bg-white">
            <Image
              src={navalMissionLogo}
              alt="Logo Missão de Assessoria Naval"
              fill
              className="object-contain"
              referrerPolicy="no-referrer"
              sizes="96px"
              priority
            />
          </div>
          <div className="text-left flex flex-col justify-center">
            <h1 className="text-sm font-black tracking-widest text-slate-900 uppercase leading-none">
              MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE
            </h1>
            <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
              Relatório de Avaliações
            </p>
          </div>
        </div>
      </div>
      
      <div className="hidden print:block mb-4">`;

content = content.replace(targetOldHeader, newHeader);

fs.writeFileSync(path, content, 'utf8');
console.log("Header replaced");
