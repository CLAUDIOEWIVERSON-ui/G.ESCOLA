const fs = require('fs');
const path = './app/(dashboard)/cursos/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<button 
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap cursor-pointer"
              >
                <FileText size={18} />
                {t.common.bulkAdd}
              </button>`;

if (content.includes(target)) {
    content = content.replace(target, '');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Button removed successfully!');
} else {
    console.log('Target not found exactly. Trying regex or fallback...');
    // We can just remove the specific block of lines 589-597
    const lines = content.split('\n');
    const idx = lines.findIndex(l => l.includes('setIsBulkModalOpen(true)'));
    if (idx !== -1) {
        // find start of button
        let start = idx;
        while(start > 0 && !lines[start].includes('<button')) start--;
        let end = idx;
        while(end < lines.length && !lines[end].includes('</button>')) end++;
        
        lines.splice(start, end - start + 1);
        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log('Button removed via fallback!');
    } else {
        console.log('Could not find the button at all');
    }
}
