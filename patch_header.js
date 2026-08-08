const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/avaliacao/page.tsx', 'utf8');

const searchStr = `        {/* Floating Steps Indicator */}
        <div className="flex items-center gap-2">`;

const replaceStr = `        {/* Floating Steps Indicator */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">`;

const searchEndStr = `            </div>
          ))}
        </div>
      </div>`;

const replaceEndStr = `            </div>
          ))}
          </div>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Abandonar
          </button>
        </div>
      </div>`;

if (code.includes(searchStr) && code.includes(searchEndStr)) {
  code = code.replace(searchStr, replaceStr);
  code = code.replace(searchEndStr, replaceEndStr);
  fs.writeFileSync('app/(dashboard)/avaliacao/page.tsx', code);
  console.log("Patched header successfully.");
} else {
  console.log("Could not find search strings.");
}
