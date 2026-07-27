const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const printContainer = `            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-visible">`;

content = content.replace(printContainer, `{selectedCard === 'exterior' && (
            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-visible">`);

const endOfContainer = `                </div>
              </div>
            </div>`;

content = content.replace(endOfContainer, `                </div>
              </div>
            </div>
            )}`);

fs.writeFileSync(file, content);
