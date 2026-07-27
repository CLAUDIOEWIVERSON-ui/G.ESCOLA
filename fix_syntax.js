const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("{selectedCard === 'exterior' && (\n            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}\n            <div className=\"hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-visible\">", "{selectedCard === 'exterior' && (\n            <>\n            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}\n            <div className=\"hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-visible\">");

content = content.replace("                </div>\n              </div>\n            </div>\n            )}", "                </div>\n              </div>\n            </div>\n            </>\n            )}");

fs.writeFileSync(file, content);
