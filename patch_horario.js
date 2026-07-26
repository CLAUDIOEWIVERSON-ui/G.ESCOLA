const fs = require('fs');
const path = './app/(dashboard)/horario/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import Image from \"next/image\";")) {
  content = content.replace(
    "import { cn } from \"@/lib/utils\";",
    "import { cn } from \"@/lib/utils\";\nimport Image from \"next/image\";\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';"
  );
}

const oldHeader = `              {/* Specialized Header */}
              <div className="bg-white p-12 text-slate-800 relative overflow-hidden print-header print-header-top border-b border-slate-200">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 print-header-grid">
                  <div className="col-span-2 space-y-3 print-header-title-container">
                    <div className="flex items-center">`;

const newHeader = `              {/* Specialized Header */}
              <div className="bg-white p-12 text-slate-800 relative overflow-hidden print-header print-header-top border-b border-slate-200">
                <div className="hidden print:flex items-center gap-4 mb-8">
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
                      Detalhe Semanal de Aulas
                    </p>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 print-header-grid">
                  <div className="col-span-2 space-y-3 print-header-title-container">
                    <div className="flex items-center">`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched horario/page.tsx");
