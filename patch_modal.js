const fs = require('fs');
const file = 'components/StudentDetailEditModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >`;

const replacement = `<button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors flex items-center gap-2 print:hidden mr-auto"
          >
            <Printer size={16} />
            {language === 'pt' ? 'Imprimir' : 'Print'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors print:hidden"
          >`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
