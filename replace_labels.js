const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', 'utf8');

const regex = /<div className=\{`grid grid-cols-5 text-center text-\[8\.5px\] font-extrabold font-mono pt-3 border-t mt-4 \$\{[\s\S]*?\}><\/div>/;

// Instead of strict regex, let's just use string replacement.

const oldGrid = `<div className={\`grid grid-cols-5 text-center text-[8.5px] font-extrabold font-mono pt-3 border-t mt-4 \${
                                 chartTheme === 'azul' ? 'text-slate-400 border-slate-800/80' : 'text-slate-500 border-slate-100'
                               }\`}>
                                 <div className={chartTheme === 'azul' ? 'text-emerald-400' : 'text-emerald-600'}>CP (5)</div>
                                 <div className={chartTheme === 'azul' ? 'text-cyan-400' : 'text-cyan-600'}>CPa (4)</div>
                                 <div className={chartTheme === 'azul' ? 'text-amber-400' : 'text-amber-600'}>Neutro (3)</div>
                                 <div className={chartTheme === 'azul' ? 'text-orange-400' : 'text-orange-600'}>DPa (2)</div>
                                 <div className={chartTheme === 'azul' ? 'text-rose-400' : 'text-rose-600'}>DP (1)</div>
                               </div>`;

const newGrid = `<div className={\`grid grid-cols-5 gap-1 text-center pt-4 border-t mt-4 leading-tight \${
                                 chartTheme === 'azul' ? 'border-slate-800/80' : 'border-slate-100'
                               }\`}>
                                 <div className={\`flex flex-col items-center \${chartTheme === 'azul' ? 'text-emerald-400' : 'text-emerald-600'}\`}>
                                   <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 font-mono mb-1">Nota 5</span>
                                   <span className="text-[8.5px] sm:text-[9.5px] font-bold font-sans uppercase">Concordo<br/>Plenamente</span>
                                 </div>
                                 <div className={\`flex flex-col items-center \${chartTheme === 'azul' ? 'text-cyan-400' : 'text-cyan-600'}\`}>
                                   <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 font-mono mb-1">Nota 4</span>
                                   <span className="text-[8.5px] sm:text-[9.5px] font-bold font-sans uppercase">Concordo<br/>Parcialmente</span>
                                 </div>
                                 <div className={\`flex flex-col items-center \${chartTheme === 'azul' ? 'text-amber-400' : 'text-amber-600'}\`}>
                                   <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 font-mono mb-1">Nota 3</span>
                                   <span className="text-[8.5px] sm:text-[9.5px] font-bold font-sans uppercase">Neutro<br/>(Regular)</span>
                                 </div>
                                 <div className={\`flex flex-col items-center \${chartTheme === 'azul' ? 'text-orange-400' : 'text-orange-600'}\`}>
                                   <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 font-mono mb-1">Nota 2</span>
                                   <span className="text-[8.5px] sm:text-[9.5px] font-bold font-sans uppercase">Discordo<br/>Parcialmente</span>
                                 </div>
                                 <div className={\`flex flex-col items-center \${chartTheme === 'azul' ? 'text-rose-400' : 'text-rose-600'}\`}>
                                   <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 font-mono mb-1">Nota 1</span>
                                   <span className="text-[8.5px] sm:text-[9.5px] font-bold font-sans uppercase">Discordo<br/>Plenamente</span>
                                 </div>
                               </div>`;

if (code.includes(oldGrid)) {
  code = code.replace(oldGrid, newGrid);
  fs.writeFileSync('app/(dashboard)/relatorio-avaliacao/page.tsx', code);
  console.log('Replaced bar chart legend');
} else {
  console.log('Old grid not found');
}
