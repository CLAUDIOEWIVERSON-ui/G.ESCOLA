const fs = require('fs');
const path = './app/(dashboard)/avaliacao/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import Image from "next/image"')) {
  content = content.replace(
    "import { cn } from '@/lib/utils';",
    "import { cn } from '@/lib/utils';\nimport Image from 'next/image';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';"
  );
}

// 1st occurrence (inside the confirmation view)
const oldWeekly1 = `          <div className="pt-6 border-t border-slate-100 text-left">
            <h3 className="text-xs font-bold text-slate-705 font-mono flex items-center gap-1.5 mb-4">
              <Clock className="h-4 w-4 text-indigo-650" />
              DETALHE SEMANAL DE AULAS COMPLETO (SÁBADO/DOMINGO LIVRE)
            </h3>`;

const newWeekly1 = `          <div className="pt-6 border-t border-slate-100 text-left">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden bg-white">
                <Image
                  src={navalMissionLogo}
                  alt="Logo Missão de Assessoria Naval"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  sizes="64px"
                  priority
                />
              </div>
              <div className="text-left flex flex-col justify-center">
                <h1 className="text-xs font-black tracking-widest text-slate-900 uppercase leading-none">
                  MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE
                </h1>
                <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
                  Detalhe Semanal de Aulas
                </p>
              </div>
            </div>
            <h3 className="text-xs font-bold text-slate-705 font-mono flex items-center gap-1.5 mb-4">
              <Clock className="h-4 w-4 text-indigo-650" />
              DETALHE SEMANAL DE AULAS COMPLETO (SÁBADO/DOMINGO LIVRE)
            </h3>`;

content = content.replace(oldWeekly1, newWeekly1);

// 2nd occurrence (inside the collapsible view)
const oldWeekly2 = `                {showWeeklySchedule && (
                  <div className="p-4 bg-white space-y-4">
                    {scheduleLoading ? (`;

const newWeekly2 = `                {showWeeklySchedule && (
                  <div className="p-4 bg-white space-y-4">
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden bg-white">
                        <Image
                          src={navalMissionLogo}
                          alt="Logo Missão de Assessoria Naval"
                          fill
                          className="object-contain"
                          referrerPolicy="no-referrer"
                          sizes="64px"
                          priority
                        />
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <h1 className="text-xs font-black tracking-widest text-slate-900 uppercase leading-none">
                          MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE
                        </h1>
                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1 leading-none">
                          Detalhe Semanal de Aulas
                        </p>
                      </div>
                    </div>
                    {scheduleLoading ? (`;

content = content.replace(oldWeekly2, newWeekly2);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched avaliacao/page.tsx");
