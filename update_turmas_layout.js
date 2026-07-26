const fs = require('fs');
const path = './app/(dashboard)/turmas/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `<div className="flex flex-col xl:flex-row items-center gap-3 w-full xl:w-auto">
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
          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block" />
          <button 
            onClick={refreshData}
            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title={t.common.refresh}
          >
            <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={18} />
              {t.classes.add}
            </button>
          )}
        </div>`;

const replaceStr = `<div className="flex flex-col items-end gap-3 w-full xl:w-auto">
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
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
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

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully replaced layout in turmas/page.tsx");
} else {
  console.log("Could not find the target string. The file might have been modified.");
}
