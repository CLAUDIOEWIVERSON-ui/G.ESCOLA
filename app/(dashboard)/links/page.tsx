'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Link2, 
  Trash2, 
  Pencil, 
  GraduationCap, 
  BookOpen, 
  Wrench, 
  ExternalLink,
  HelpCircle,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase/client';

interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'academic' | 'admin' | 'library' | 'external' | 'others';
}

const DEFAULT_LINKS: LinkItem[] = [
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110001",
    name: "Portal do Aluno",
    url: "https://portal.escola.edu",
    description: "Acesse notas, boletins parciais, grade horária e realize rematrículas online.",
    category: "academic",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110002",
    name: "Ambiente Virtual EaD (Moodle)",
    url: "https://ead.escola.edu",
    description: "Plataforma oficial de ensino a distância com aulas gravadas, fóruns de discussão e fórum de dúvidas.",
    category: "academic",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110003",
    name: "Biblioteca Digital Integrada",
    url: "https://biblioteca.escola.edu",
    description: "Acesso ao acervo online de livros acadêmicos recomendados, artigos científicos de alta qualidade e periódicos.",
    category: "library",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110004",
    name: "Suporte de TI e Service Desk",
    url: "https://suporte.escola.edu",
    description: "Abertura de chamados técnicos para problemas relacionados a login institucional, rede wi-fi ou infraestrutura.",
    category: "admin",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110005",
    name: "Calendário Acadêmico Oficial 2024",
    url: "https://escola.edu/calendario-2024.pdf",
    description: "Visualização e download do calendário letivo contendo datas de provas, recessos e eventos acadêmicos marcantes.",
    category: "academic",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110006",
    name: "Webmail Institucional G-Suite",
    url: "https://mail.google.com/a/escola.edu",
    description: "Acesse sua caixa postal corporativa e ferramentas colaborativas integradas da conta escolar.",
    category: "external",
  },
  {
    id: "c3194511-bba0-42f8-9a3c-b171f1110007",
    name: "Periódicos CAPES & Google Acadêmico",
    url: "https://www.periodicos.capes.gov.br",
    description: "Bases externas e externas de inteligência, pesquisas, teses e publicações científicas renomadas.",
    category: "external",
  }
];

const isUUID = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export default function LinksUteisPage() {
  const { t } = useI18n();
  const { isAdmin } = useUser();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'academic' | 'admin' | 'library' | 'external' | 'others'>('academic');

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/links');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede: ${res.status}`);
      }
      const data = await res.json();

      setIsTableMissing(false);

      if (data) {
        setLinks(data as LinkItem[]);
        // Sync local cache
        localStorage.setItem('school_useful_links', JSON.stringify(data));
      }
    } catch (err: any) {
      console.warn('Error fetching from Supabase, falling back to localStorage...', err);
      
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        setIsTableMissing(true);
      }

      const storedLinks = localStorage.getItem('school_useful_links');
      if (storedLinks !== null) {
        try {
          setLinks(JSON.parse(storedLinks));
        } catch (e) {
          setLinks(DEFAULT_LINKS);
        }
      } else {
        setLinks(DEFAULT_LINKS);
        localStorage.setItem('school_useful_links', JSON.stringify(DEFAULT_LINKS));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLinks();
    };
    init();
  }, [fetchLinks]);

  const handleOpenAddModal = () => {
    setSelectedLink(null);
    setName('');
    setUrl('');
    setDescription('');
    setCategory('academic');
    setModalOpen(true);
  };

  const handleOpenEditModal = (link: LinkItem) => {
    setSelectedLink(link);
    setName(link.name);
    setUrl(link.url);
    setDescription(link.description);
    setCategory(link.category);
    setModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t.links.formErrorName);
      return;
    }

    if (!url.trim() || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      toast.error(t.links.formErrorUrl);
      return;
    }

    setIsLoading(true);
    try {
      if (isTableMissing) {
        // Direct local save fallback when database is not migrated yet
        let updatedLinks: LinkItem[] = [];
        if (selectedLink) {
          updatedLinks = links.map(l => l.id === selectedLink.id ? {
            ...l,
            name,
            url,
            description,
            category
          } : l);
        } else {
          const newLink: LinkItem = {
            id: `link-${Date.now()}`,
            name,
            url,
            description,
            category
          };
          updatedLinks = [...links, newLink];
        }
        setLinks(updatedLinks);
        localStorage.setItem('school_useful_links', JSON.stringify(updatedLinks));
        toast.success(t.links.saveSuccess);
        setSearch('');
        setModalOpen(false);
        return;
      }

      if (selectedLink && isUUID(selectedLink.id)) {
        // Edit in global DB
        const res = await fetchWithAuth('/api/links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedLink.id,
            name,
            url,
            description,
            category
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro de rede: ${res.status}`);
        }
        toast.success(t.links.saveSuccess);
      } else {
        // Add or convert legacy to global DB
        const res = await fetchWithAuth('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            url,
            description,
            category
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro de rede: ${res.status}`);
        }
        toast.success(t.links.saveSuccess);
      }

      await fetchLinks();
      setSearch('');
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving link globally:', err?.message || err);
      toast.error('Erro ao salvar o link globalmente.');

      // Resilient local fallback
      let updatedLinks: LinkItem[] = [];
      if (selectedLink) {
        updatedLinks = links.map(l => l.id === selectedLink.id ? {
          ...l,
          name,
          url,
          description,
          category
        } : l);
      } else {
        const newLink: LinkItem = {
          id: `link-${Date.now()}`,
          name,
          url,
          description,
          category
        };
        updatedLinks = [...links, newLink];
      }
      setLinks(updatedLinks);
      localStorage.setItem('school_useful_links', JSON.stringify(updatedLinks));
      setSearch('');
      setModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      setIsLoading(true);
      try {
        if (isTableMissing) {
          // Direct local delete fallback when database is not migrated yet
          const updated = links.filter(l => l.id !== id);
          setLinks(updated);
          localStorage.setItem('school_useful_links', JSON.stringify(updated));
          toast.success(t.links.deleteSuccess);
          return;
        }

        if (isUUID(id)) {
          const res = await fetchWithAuth(`/api/links?id=${id}`, {
            method: 'DELETE'
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro de rede: ${res.status}`);
          }
        }
        
        // Ensure we also clean up local storage cache to match DB
        const updated = links.filter(l => l.id !== id);
        setLinks(updated);
        localStorage.setItem('school_useful_links', JSON.stringify(updated));

        toast.success(t.links.deleteSuccess);
        await fetchLinks();
      } catch (err: any) {
        console.error('Error deleting link globally:', err?.message || err);
        toast.error('Erro ao excluir o link globalmente.');

        // Local fallback
        const updated = links.filter(l => l.id !== id);
        setLinks(updated);
        localStorage.setItem('school_useful_links', JSON.stringify(updated));
      } finally {
        setIsLoading(false);
        setConfirmDeleteId(null);
      }
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId((current) => current === id ? null : current);
      }, 4000);
    }
  };

  const handleDeleteAllLinks = async () => {
    if (confirmDeleteAll) {
      setIsLoading(true);
      try {
        if (isTableMissing) {
          setLinks([]);
          localStorage.setItem('school_useful_links', JSON.stringify([]));
          toast.success("Todos os links foram apagados localmente.");
          return;
        }

        const res = await fetchWithAuth('/api/links?all=true', {
          method: 'DELETE'
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro de rede: ${res.status}`);
        }

        setLinks([]);
        localStorage.setItem('school_useful_links', JSON.stringify([]));
        toast.success("Todos os links foram excluídos com sucesso.");
      } catch (err: any) {
        console.error('Error deleting all links globally:', err?.message || err);
        toast.error('Erro ao excluir todos os links globalmente.');

        // Local fallback
        setLinks([]);
        localStorage.setItem('school_useful_links', JSON.stringify([]));
      } finally {
        setIsLoading(false);
        setConfirmDeleteAll(false);
      }
    } else {
      setConfirmDeleteAll(true);
      setTimeout(() => {
        setConfirmDeleteAll(false);
      }, 4000);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'academic':
        return <GraduationCap size={20} className="text-blue-500" />;
      case 'library':
        return <BookOpen size={20} className="text-emerald-500" />;
      case 'admin':
        return <Wrench size={20} className="text-purple-500" />;
      case 'external':
        return <ExternalLink size={20} className="text-amber-500" />;
      default:
        return <Link2 size={20} className="text-slate-500" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'academic': 
        return t.links.categoryAcademic;
      case 'admin':
        return t.links.categoryAdmin;
      case 'library':
        return t.links.categoryLibrary;
      case 'external':
        return t.links.categoryExternal;
      default:
        return t.links.categoryOthers;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'academic':
        return "bg-blue-50 text-blue-700 border-blue-100";
      case 'library':
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'admin':
        return "bg-purple-50 text-purple-700 border-purple-100";
      case 'external':
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const filteredLinks = links.filter(link => {
    const searchLower = search.toLowerCase();
    const nameMatch = (link.name || '').toLowerCase().includes(searchLower);
    const descriptionMatch = (link.description || '').toLowerCase().includes(searchLower);
    const urlMatch = (link.url || '').toLowerCase().includes(searchLower);
    const categoryMatch = (link.category || '').toLowerCase().includes(searchLower);
    return nameMatch || descriptionMatch || urlMatch || categoryMatch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" richColors />
      
      {/* Header section with neat typography & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.links.title}</h1>
          <p className="text-slate-500 text-sm mt-1">{t.links.subtitle}</p>
        </div>

      </div>

      {isAdmin && isTableMissing && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                Sincronização Global Pendente (Banco de Dados)
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
                A tabela <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[11px] font-mono">useful_links</code> ainda não foi criada no seu banco de dados Supabase do projeto. Atualmente, os links adicionados ou editados estão funcionando e salvos residindo no armazenamento local do seu navegador (localStorage). Para que todos os usuários (alunos/instrutores) acessem os mesmos links de forma síncrona, execute a migração SQL no seu painel.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.useful_links;
DROP POLICY IF EXISTS "Admins have full access" ON public.useful_links;

CREATE POLICY "Public read access" ON public.useful_links FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.useful_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);`);
                  toast.success("Script SQL copiado com sucesso!");
                }}
                className="bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Copiar SQL
              </button>
            </div>
            
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto pr-24 max-h-40 whitespace-pre">
{`CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.useful_links FOR SELECT USING (true);
CREATE POLICY "Admins have full access" ON public.useful_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);`}
            </pre>
          </div>
          
          <div className="text-slate-500 text-[11px]">
            💡 <strong>Como resolver rapidamente:</strong> Acesse seu painel do Supabase, clique em <strong>SQL Editor</strong>, crie uma <strong>New Query</strong>, cole o código acima e clique em <strong>Run</strong>. Feito isso, os links serão gravados globalmente na nuvem e atualizados em tempo real!
          </div>
        </div>
      )}

      {/* Search bar container */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t.common.search || 'Buscar'}... (Portal, Moodle, G-Suite, PDF...)`}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm"
        />
      </div>

      {/* Row list of Links (Empilhado sem classificação) or Loading Spinner */}
      <AnimatePresence mode="popLayout" initial={false}>
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-3"
          >
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">{t.common.loading || 'Carregando...'}</p>
          </motion.div>
        ) : filteredLinks.length > 0 ? (
          <motion.div 
            layout 
            className="flex flex-col gap-2.5"
          >
            {filteredLinks.map((link) => (
              <motion.div
                layout
                key={link.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={() => window.open(link.url, '_blank')}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer relative overflow-hidden"
              >
                {/* Visual strip on the left with category color for elegant aesthetic */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  link.category === 'academic' ? "bg-blue-500" :
                  link.category === 'library' ? "bg-emerald-500" :
                  link.category === 'admin' ? "bg-purple-500" : "bg-amber-500"
                )} />

                {/* Left Side: Icon & Link details (Name + Description) */}
                <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                    {getCategoryIcon(link.category)}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3">
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-sm truncate max-w-[280px]">
                      {link.name}
                    </h3>
                    <p className="text-slate-400 text-xs truncate lg:max-w-lg">
                      {link.description || '(Sem descrição disponível)'}
                    </p>
                  </div>
                </div>

                {/* Right Side: URL domain */}
                <div className="flex items-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[180px] group-hover:text-blue-500 transition-colors">
                    {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center"
          >
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-800">{t.common.noneFound || 'Nenhum registro encontrado.'}</h3>
            <p className="text-slate-400 text-sm mt-1">Experimente buscar por outros termos ou crie um novo link.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedLink ? t.links.editLink : t.links.addLink}
      >
        <form onSubmit={handleSaveLink} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              {t.links.name} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Portal Acadêmico"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              {t.links.url} *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all text-slate-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              {t.links.category} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            >
              <option value="academic">{t.links.categoryAcademic}</option>
              <option value="admin">{t.links.categoryAdmin}</option>
              <option value="library">{t.links.categoryLibrary}</option>
              <option value="external">{t.links.categoryExternal}</option>
              <option value="others">{t.links.categoryOthers}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              {t.links.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva brevemente o propósito deste recurso..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
            >
              {t.common.cancel || 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              {t.common.save || 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
