const fs = require('fs');
const path = '/app/applet/app/(dashboard)/relatorio-avaliacao/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = `<div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 print:bg-transparent border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Relatório (A4)
          </button>
        </div>`;

const replacement = `<div className="flex flex-wrap gap-2 print:hidden items-center">
          <select
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as 'color' | 'bw')}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-sm"
          >
            <option value="color">🎨 Imprimir Colorido</option>
            <option value="bw">⚫ Preto e Branco</option>
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 print:bg-transparent border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Relatório (A4)
          </button>
        </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(path, code);
  console.log('Patched print buttons!');
} else {
  console.log('Target not found!');
}
