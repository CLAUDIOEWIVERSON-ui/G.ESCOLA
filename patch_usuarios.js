const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/usuarios/page.tsx', 'utf8');

// 1. Add state
const searchState = `const [saving, setSaving] = useState(false);`;
const replaceState = `const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);`;
if (code.includes(searchState)) {
  code = code.replace(searchState, replaceState);
} else {
  console.log("searchState not found");
}

// 2. Add icon import
const searchIcon = `from 'lucide-react';`;
const replaceIcon = `RefreshCw } from 'lucide-react';`;
if (code.includes("RefreshCw")) {
  // Already imported
} else if (code.includes(searchIcon)) {
  code = code.replace(searchIcon, replaceIcon);
}

// 3. Add handleSync function
const searchFunc = `const handleOpenModal = (user: any = null) => {`;
const replaceFunc = `const handleSync = async () => {
    if (!confirm(language === 'pt' ? 'Deseja sincronizar as contas de alunos com o módulo de turmas?' : 'Do you want to sync student accounts with the classes module?')) return;
    
    setIsSyncing(true);
    try {
      const response = await fetchWithAuth('/api/admin/users/sync', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      toast.success(data.message || (language === 'pt' ? 'Sincronização concluída com sucesso!' : 'Sync completed successfully!'));
      fetchUsers();
    } catch (err: any) {
      console.error('Error syncing:', err);
      toast.error(err.message || (language === 'pt' ? 'Erro ao sincronizar' : 'Error syncing'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenModal = (user: any = null) => {`;
if (code.includes(searchFunc)) {
  code = code.replace(searchFunc, replaceFunc);
} else {
  console.log("searchFunc not found");
}

// 4. Add Sync Button
const searchBtn = `{!isConvidado && (
          <button
            onClick={() => handleOpenModal()}`;
const replaceBtn = `{!isConvidado && (
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {language === 'pt' ? 'Sincronizar com Turmas' : 'Sync with Classes'}
            </button>
            <button
              onClick={() => handleOpenModal()}`;
if (code.includes(searchBtn)) {
  code = code.replace(searchBtn, replaceBtn);
  code = code.replace(`          </button>
        )}`, `            </button>
          </div>
        )}`);
} else {
  console.log("searchBtn not found");
}

fs.writeFileSync('app/(dashboard)/usuarios/page.tsx', code);
console.log("Patched usuarios/page.tsx");
