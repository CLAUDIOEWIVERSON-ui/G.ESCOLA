const fs = require('fs');
const file = 'components/Modal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace fixed with print:absolute
content = content.replace('className="fixed inset-0', 'className="fixed print:absolute print:inset-auto print:bg-white inset-0');

// Replace max-h-[90vh] with print:max-h-none
content = content.replace('max-h-[90vh]', 'max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:max-w-full');

// Replace overflow-y-auto with print:overflow-visible
content = content.replace('overflow-y-auto', 'overflow-y-auto print:overflow-visible');

// Hide the close button in print
content = content.replace('className="p-2 hover:bg-slate-50', 'className="print:hidden p-2 hover:bg-slate-50');

fs.writeFileSync(file, content);
