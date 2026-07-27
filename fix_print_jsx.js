const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use regex to wrap the print block in <> </>
content = content.replace(/\{selectedCard === 'exterior' && \(\s*\{\/\* PRINT LAYOUT FOR ALUNOS EXTERIOR \*\/\}/, "{selectedCard === 'exterior' && (\n        <>\n                {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}");

content = content.replace(/              <\/div>\n      \)\}\n    <\/div>\n  \);\n\}/, "              </div>\n        </>\n      )}\n    </div>\n  );\n}");

fs.writeFileSync(file, content);
