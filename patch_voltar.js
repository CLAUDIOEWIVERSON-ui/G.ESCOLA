const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/avaliacao/page.tsx', 'utf8');

const searchStr1 = `                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>`;

const replaceStr1 = `                <ChevronLeft className="h-4 w-4" />
                {(qrTurmaId ? currentStep === 2 : currentStep === 1) ? 'Sair' : 'Voltar'}
              </button>`;

let prevCode = '';
let count = 0;
while (prevCode !== code) {
  prevCode = code;
  code = code.replace(searchStr1, replaceStr1);
  if (prevCode !== code) count++;
}

fs.writeFileSync('app/(dashboard)/avaliacao/page.tsx', code);
console.log("Patched " + count + " instances of Voltar.");
