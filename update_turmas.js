const fs = require('fs');
const path = './app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLines = content.split('\n');

const startIdx = targetLines.findIndex(l => l.includes('<div className="flex flex-col xl:flex-row items-center gap-3 w-full xl:w-auto">'));
const addBtnIdx = targetLines.findIndex((l, i) => i > startIdx && l.includes('{t.classes.add}'));
let endIdx = addBtnIdx;
while(endIdx < targetLines.length && !targetLines[endIdx].includes('</div>')) endIdx++;

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `        <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
          <div className="flex flex-col xl:flex-row items-center gap-3 w-full">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              {['GAT', 'MAN'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setActiveGroup(grp)}
                  className={cn(
                    "px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeGroup === grp
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {grp}
                </button>
              ))}
            </div>
            <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden xl:block" />
            <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full xl:w-[620px]">
              {(['all', 'expedito', 'especial', 'carreira', 'ead', 'exterior'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer text-center flex items-center justify-center",
                    activeCategory === cat 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {t.classes[\`category\${cat.charAt(0).toUpperCase() + cat.slice(1)}\` as keyof typeof t.classes]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 w-full">
            <button 
              onClick={refreshData}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
              title={t.common.refresh}
            >
              <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
            {!isReadOnly && (
              <button 
                onClick={() => handleOpenModal()}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 w-full sm:w-auto"
              >
                <Plus size={18} />
                {t.classes.add}
              </button>
            )}
          </div>
        </div>`;
        
    targetLines.splice(startIdx, endIdx - startIdx + 1, replacement);
    fs.writeFileSync(path, targetLines.join('\n'), 'utf8');
    console.log("Successfully replaced layout by index");
} else {
    console.log("Indices not found", startIdx, endIdx);
}
