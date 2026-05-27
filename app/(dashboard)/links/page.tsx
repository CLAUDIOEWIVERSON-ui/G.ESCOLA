'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
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

interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'academic' | 'admin' | 'library' | 'external' | 'others';
}

const DEFAULT_LINKS: LinkItem[] = [
  {
    id: "link-1",
    name: "Portal do Aluno",
    url: "https://portal.escola.edu",
    description: "Acesse notas, boletins parciais, grade horária e realize rematrículas online.",
    category: "academic",
  },
  {
    id: "link-2",
    name: "Ambiente Virtual EaD (Moodle)",
    url: "https://ead.escola.edu",
    description: "Plataforma oficial de ensino a distância com aulas gravadas, fóruns de discussão e fórum de dúvidas.",
    category: "academic",
  },
  {
    id: "link-3",
    name: "Biblioteca Digital Integrada",
    url: "https://biblioteca.escola.edu",
    description: "Acesso ao acervo online de livros acadêmicos recomendados, artigos científicos de alta qualidade e periódicos.",
    category: "library",
  },
  {
    id: "link-4",
    name: "Suporte de TI e Service Desk",
    url: "https://suporte.escola.edu",
    description: "Abertura de chamados técnicos para problemas relacionados a login institucional, rede wi-fi ou infraestrutura.",
    category: "admin",
  },
  {
    id: "link-5",
    name: "Calendário Acadêmico Oficial 2024",
    url: "https://escola.edu/calendario-2024.pdf",
    description: "Visualização e download do calendário letivo contendo datas de provas, recessos e eventos acadêmicos marcantes.",
    category: "academic",
  },
  {
    id: "link-6",
    name: "Webmail Institucional G-Suite",
    url: "https://mail.google.com/a/escola.edu",
    description: "Acesse sua caixa postal corporativa e ferramentas colaborativas integradas da conta escolar.",
    category: "external",
  },
  {
    id: "link-7",
    name: "Periódicos CAPES & Google Acadêmico",
    url: "https://www.periodicos.capes.gov.br",
    description: "Bases externas e externas de inteligência, pesquisas, teses e publicações científicas renomadas.",
    category: "external",
  }
];

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

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'academic' | 'admin' | 'library' | 'external' | 'others'>('academic');

  useEffect(() => {
    const storedLinks = localStorage.getItem('school_useful_links');
    if (storedLinks) {
      try {
        const parsed = JSON.parse(storedLinks);
        setTimeout(() => {
          setLinks(parsed);
          setIsLoading(false);
        }, 0);
      } catch (e) {
        setTimeout(() => {
          setLinks(DEFAULT_LINKS);
          setIsLoading(false);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setLinks(DEFAULT_LINKS);
        localStorage.setItem('school_useful_links', JSON.stringify(DEFAULT_LINKS));
        setIsLoading(false);
      }, 0);
    }
  }, []);

  const saveToLocalStorage = (newLinks: LinkItem[]) => {
    setLinks(newLinks);
    localStorage.setItem('school_useful_links', JSON.stringify(newLinks));
  };

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

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t.links.formErrorName);
      return;
    }

    if (!url.trim() || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      toast.error(t.links.formErrorUrl);
      return;
    }

    let updatedLinks: LinkItem[] = [];

    if (selectedLink) {
      // Edit
      updatedLinks = links.map(l => l.id === selectedLink.id ? {
        ...l,
        name,
        url,
        description,
        category
      } : l);
      toast.success(t.links.saveSuccess);
    } else {
      // Add
      const newLink: LinkItem = {
        id: `link-${Date.now()}`,
        name,
        url,
        description,
        category
      };
      updatedLinks = [...links, newLink];
      toast.success(t.links.saveSuccess);
    }

    saveToLocalStorage(updatedLinks);
    setSearch('');
    setModalOpen(false);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      const updated = links.filter(l => l.id !== id);
      saveToLocalStorage(updated);
      toast.success(t.links.deleteSuccess);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId((current) => current === id ? null : current);
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
    return link.name.toLowerCase().includes(search.toLowerCase()) || 
           link.description.toLowerCase().includes(search.toLowerCase()) || 
           link.url.toLowerCase().includes(search.toLowerCase());
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
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-5 rounded-xl uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm inline-flex shrink-0 border border-slate-800"
          >
            <Plus size={16} />
            {t.links.addLink}
          </button>
        )}
      </div>

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

                {/* Right Side: URL domain & Actions */}
                <div className="flex items-center justify-between sm:justify-start gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[180px] group-hover:text-blue-500 transition-colors">
                    {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(link)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                          title={t.common.edit || 'Editar'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLink(link.id, e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-center font-bold text-xs leading-none shrink-0",
                            confirmDeleteId === link.id
                              ? "bg-rose-500 text-white hover:bg-rose-600 px-2 py-1 shadow-sm border border-rose-500"
                              : "hover:bg-red-50 text-rose-500 hover:text-rose-700"
                          )}
                          title={confirmDeleteId === link.id ? "Clique novamente para confirmar" : (t.common.delete || 'Excluir')}
                        >
                          {confirmDeleteId === link.id ? (
                            <span className="text-[9px] uppercase tracking-wider">Confirmar?</span>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Simple chevron or external indicator */}
                    <div className="p-1 px-2 hover:bg-slate-50 rounded-lg text-blue-500 hover:text-blue-600 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0">
                      <span>{t.links.openLink}</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
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
