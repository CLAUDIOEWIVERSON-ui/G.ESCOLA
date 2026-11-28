'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  Copy,
  Download,
  Check,
  ChevronLeft,
  HardDrive,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { EnergyLoadingBar } from '@/components/EnergyLoadingBar';

export interface StudentNote {
  id: string;
  title: string;
  subject: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'student_notepad_v1:';

export function getStudentNotepadStorageKey(profile: {
  student_id?: string;
  id?: string;
  access_code?: string;
  matricula?: string;
} | null): string {
  const uniqueId =
    profile?.student_id ||
    profile?.id ||
    profile?.access_code ||
    profile?.matricula ||
    'guest';
  return `${STORAGE_PREFIX}${uniqueId}`;
}

export function readStudentNotesFromDevice(storageKey: string): StudentNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
      .map((item) => ({
        id: String(item.id),
        title: String(item.title || ''),
        subject: String(item.subject || ''),
        content: String(item.content || ''),
        pinned: Boolean(item.pinned),
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
      }));
  } catch {
    return [];
  }
}

function writeStudentNotesToDevice(storageKey: string, notes: StudentNote[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(notes));
    return true;
  } catch (err) {
    console.error('Failed to save notes to device storage:', err);
    return false;
  }
}

function createEmptyNote(): StudentNote {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: '',
    subject: '',
    content: '',
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function StudentNotepad() {
  const { profile, loading: authLoading } = useUser();
  const { language } = useI18n();
  const isPt = language === 'pt';

  const storageKey = useMemo(() => getStudentNotepadStorageKey(profile), [profile]);

  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loadedKey, setLoadedKey] = useState<string>('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowEditor, setMobileShowEditor] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const loaded = readStudentNotesFromDevice(storageKey);
    setNotes(loaded);
    setLoadedKey(storageKey);
    setConfirmDeleteId(null);
    setSearchQuery('');
    if (loaded.length > 0) {
      const sorted = [...loaded].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
      setSelectedNoteId(sorted[0].id);
    } else {
      setSelectedNoteId(null);
    }
    setMobileShowEditor(false);
  }, [storageKey, authLoading]);

  const persistNotes = (nextNotes: StudentNote[]) => {
    setNotes(nextNotes);
    const ok = writeStudentNotesToDevice(storageKey, nextNotes);
    if (ok) {
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString(isPt ? 'pt-BR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else {
      toast.error(
        isPt
          ? 'Armazenamento do dispositivo cheio. Exclua notas antigas para continuar salvando.'
          : 'Device storage full. Delete older notes to keep saving.'
      );
    }
  };

  const handleCreateNote = () => {
    const newNote = createEmptyNote();
    const nextNotes = [newNote, ...notes];
    persistNotes(nextNotes);
    setSelectedNoteId(newNote.id);
    setConfirmDeleteId(null);
    setMobileShowEditor(true);
  };

  const handleUpdateNote = (
    id: string,
    patch: Partial<Pick<StudentNote, 'title' | 'subject' | 'content' | 'pinned'>>
  ) => {
    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      note.id === id ? { ...note, ...patch, updatedAt: now } : note
    );
    persistNotes(nextNotes);
  };

  const handleDeleteNote = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    persistNotes(remaining);
    setConfirmDeleteId(null);
    if (selectedNoteId === id) {
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) {
        setMobileShowEditor(false);
      }
    }
    toast.success(isPt ? 'Anotação excluída do dispositivo.' : 'Note deleted from device.');
  };

  const handleCopyNote = async (note: StudentNote) => {
    const header = [note.title.trim(), note.subject.trim()].filter(Boolean).join(' — ');
    const fullText = header ? `${header}\n\n${note.content}` : note.content;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedId(note.id);
      toast.success(isPt ? 'Texto copiado para a área de transferência.' : 'Copied to clipboard.');
      setTimeout(() => setCopiedId((curr) => (curr === note.id ? null : curr)), 1800);
    } catch {
      toast.error(isPt ? 'Não foi possível copiar o texto.' : 'Could not copy text.');
    }
  };

  const handleDownloadNote = (note: StudentNote) => {
    const safeName = (note.title.trim() || 'anotacao')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    const lines = [
      note.title.trim() || (isPt ? 'Sem título' : 'Untitled'),
      note.subject.trim() ? `${isPt ? 'Disciplina/Assunto' : 'Subject'}: ${note.subject.trim()}` : null,
      `${isPt ? 'Atualizado em' : 'Updated'}: ${new Date(note.updatedAt).toLocaleString(isPt ? 'pt-BR' : 'en-US')}`,
      '----------------------------------------',
      note.content,
    ].filter((line): line is string => line !== null);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'anotacao'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sortedFilteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.subject.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
        )
      : notes;

    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [notes, searchQuery]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const studentDisplayName =
    profile?.posto_graduacao || profile?.nome_guerra
      ? `${profile?.posto_graduacao || ''} ${profile?.nome_guerra || profile?.full_name || ''}`.trim()
      : profile?.full_name || profile?.nome || (isPt ? 'Aluno' : 'Student');

  const activeWordCount = useMemo(() => {
    if (!activeNote?.content.trim()) return 0;
    return activeNote.content.trim().split(/\s+/).length;
  }, [activeNote?.content]);

  const activeCharCount = activeNote?.content.length || 0;

  if (authLoading || loadedKey !== storageKey) {
    return (
      <div className="max-w-6xl mx-auto">
        <EnergyLoadingBar className="min-h-[45vh]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 bg-white text-black">
      {/* Cabeçalho direto do Bloco de Notas Individual */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center shrink-0">
              <StickyNote size={20} className="text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-black uppercase truncate">
                {isPt ? 'Bloco de Notas Individual' : 'Personal Notepad'}
              </h1>
              <p className="text-xs text-black flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                <span className="inline-flex items-center gap-1 font-bold">
                  <HardDrive size={12} className="text-black shrink-0" />
                  {isPt ? 'Armazenamento local neste dispositivo' : 'Stored locally on this device'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bold">{studentDisplayName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-bold">
                  {notes.length}{' '}
                  {notes.length === 1
                    ? isPt
                      ? 'anotação'
                      : 'note'
                    : isPt
                      ? 'anotações'
                      : 'notes'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNote}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide text-white cursor-pointer transition-all active:scale-[0.98] shrink-0 student-solid-btn mobile-only-neon-3d neon-tone-emerald bg-black hover:bg-slate-800 border-2 border-black"
        >
          <Plus size={18} className="text-white shrink-0" />
          <span>{isPt ? 'Nova Anotação' : 'New Note'}</span>
        </button>
      </div>

      {/* Área Principal: Lista + Editor */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden min-h-[540px] flex flex-col md:flex-row">
        {/* Coluna Esquerda: Lista de Anotações */}
        <aside
          className={cn(
            'w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-300 flex flex-col bg-white shrink-0',
            mobileShowEditor ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="p-3.5 border-b border-slate-300">
            <div className="relative flex items-center">
              <Search size={15} className="text-black absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isPt ? 'Buscar nas anotações...' : 'Search notes...'}
                aria-label={isPt ? 'Buscar nas anotações' : 'Search notes'}
                className="w-full pl-9 pr-8 py-2.5 min-h-[44px] text-xs font-bold text-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-black"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={isPt ? 'Limpar busca' : 'Clear search'}
                  className="absolute right-2 p-1.5 text-black hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200 max-h-[520px] md:max-h-[600px]">
            {sortedFilteredNotes.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <FileText size={28} className="text-black mx-auto opacity-60" />
                <p className="text-xs font-bold text-black">
                  {notes.length === 0
                    ? isPt
                      ? 'Nenhuma anotação salva neste dispositivo ainda.'
                      : 'No notes saved on this device yet.'
                    : isPt
                      ? 'Nenhuma anotação corresponde à sua busca.'
                      : 'No notes match your search.'}
                </p>
                {notes.length === 0 && (
                  <button
                    type="button"
                    onClick={handleCreateNote}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase text-white cursor-pointer student-solid-btn mobile-only-neon-3d neon-tone-blue bg-black hover:bg-slate-800 border-2 border-black"
                  >
                    <Plus size={15} className="text-white" />
                    <span>{isPt ? 'Criar Primeira Anotação' : 'Create First Note'}</span>
                  </button>
                )}
              </div>
            ) : (
              sortedFilteredNotes.map((note) => {
                const isSelected = note.id === activeNote?.id;
                const displayTitle =
                  note.title.trim() || (isPt ? 'Anotação sem título' : 'Untitled note');
                const previewText =
                  note.content.trim() || (isPt ? 'Toque para escrever...' : 'Tap to write...');
                const updatedFormatted = new Date(note.updatedAt).toLocaleString(
                  isPt ? 'pt-BR' : 'en-US',
                  { dateStyle: 'short', timeStyle: 'short' }
                );

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setConfirmDeleteId(null);
                      setMobileShowEditor(true);
                    }}
                    className={cn(
                      'w-full text-left p-4 transition-colors cursor-pointer flex flex-col gap-1.5 min-h-[68px]',
                      isSelected
                        ? 'bg-slate-100 border-b border-black'
                        : 'bg-white hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm tracking-tight truncate',
                          isSelected ? 'font-black text-black' : 'font-bold text-black'
                        )}
                      >
                        {displayTitle}
                      </span>
                      {note.pinned && (
                        <Pin size={13} className="text-black shrink-0" aria-label="Fixada" />
                      )}
                    </div>

                    <p className="text-xs text-black line-clamp-2 leading-relaxed">
                      {previewText}
                    </p>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums font-bold text-black pt-0.5">
                      {note.subject.trim() && (
                        <>
                          <span className="truncate max-w-[140px] uppercase">
                            {note.subject.trim()}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>{updatedFormatted}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Coluna Direita: Editor da Anotação */}
        <section
          className={cn(
            'flex-1 flex flex-col bg-white min-w-0',
            mobileShowEditor ? 'flex' : 'hidden md:flex'
          )}
        >
          {activeNote ? (
            <>
              {/* Barra superior de ações do editor */}
              <div className="p-3.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileShowEditor(false)}
                    className="md:hidden inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl border border-black bg-white text-black text-xs font-black cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    <span>{isPt ? 'Anotações' : 'Notes'}</span>
                  </button>

                  <span className="text-[11px] font-mono tabular-nums font-bold text-black">
                    {lastSavedTime
                      ? `${isPt ? 'Salvo às' : 'Saved at'} ${lastSavedTime}`
                      : isPt
                        ? 'Salvo no dispositivo'
                        : 'Saved on device'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateNote(activeNote.id, { pinned: !activeNote.pinned })
                    }
                    title={
                      activeNote.pinned
                        ? isPt
                          ? 'Desafixar anotação'
                          : 'Unpin note'
                        : isPt
                          ? 'Fixar no topo'
                          : 'Pin to top'
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold transition cursor-pointer',
                      activeNote.pinned
                        ? 'border-2 border-black bg-slate-100 text-black font-black'
                        : 'border-slate-300 bg-white text-black hover:border-black'
                    )}
                  >
                    {activeNote.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                    <span className="hidden sm:inline">
                      {activeNote.pinned
                        ? isPt
                          ? 'Fixada'
                          : 'Pinned'
                        : isPt
                          ? 'Fixar'
                          : 'Pin'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyNote(activeNote)}
                    title={isPt ? 'Copiar texto' : 'Copy text'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 hover:border-black bg-white text-black text-xs font-bold transition cursor-pointer"
                  >
                    {copiedId === activeNote.id ? <Check size={15} /> : <Copy size={15} />}
                    <span className="hidden sm:inline">
                      {copiedId === activeNote.id
                        ? isPt
                          ? 'Copiado'
                          : 'Copied'
                        : isPt
                          ? 'Copiar'
                          : 'Copy'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadNote(activeNote)}
                    title={isPt ? 'Baixar arquivo .txt' : 'Download .txt file'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 hover:border-black bg-white text-black text-xs font-bold transition cursor-pointer"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">.TXT</span>
                  </button>

                  {confirmDeleteId === activeNote.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(activeNote.id)}
                        className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase text-white cursor-pointer student-solid-btn mobile-only-neon-3d neon-tone-rose bg-black hover:bg-slate-800 border-2 border-black"
                      >
                        {isPt ? 'Confirmar' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-black text-xs font-bold cursor-pointer"
                      >
                        {isPt ? 'Cancelar' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeNote.id)}
                      title={isPt ? 'Excluir anotação' : 'Delete note'}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 hover:border-black bg-white text-black text-xs font-bold transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">{isPt ? 'Excluir' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Campos de Edição */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) =>
                      handleUpdateNote(activeNote.id, { title: e.target.value })
                    }
                    placeholder={isPt ? 'Título da anotação...' : 'Note title...'}
                    aria-label={isPt ? 'Título da anotação' : 'Note title'}
                    className="sm:col-span-2 w-full px-3.5 py-2.5 min-h-[44px] text-base font-black text-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-black"
                  />

                  <input
                    type="text"
                    value={activeNote.subject}
                    onChange={(e) =>
                      handleUpdateNote(activeNote.id, { subject: e.target.value })
                    }
                    placeholder={isPt ? 'Disciplina / Assunto (opcional)' : 'Subject (optional)'}
                    aria-label={isPt ? 'Disciplina ou assunto' : 'Subject'}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>

                <textarea
                  value={activeNote.content}
                  onChange={(e) =>
                    handleUpdateNote(activeNote.id, { content: e.target.value })
                  }
                  placeholder={
                    isPt
                      ? 'Escreva aqui suas anotações de aula, lembretes de estudo, dúvidas ou resumos. Tudo fica salvo automaticamente apenas neste dispositivo para a sua conta.'
                      : 'Write your class notes, study reminders, or summaries here. Everything is automatically saved locally on this device for your account.'
                  }
                  aria-label={isPt ? 'Conteúdo da anotação' : 'Note content'}
                  className="flex-1 w-full min-h-[300px] sm:min-h-[380px] p-4 text-sm leading-relaxed text-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-black resize-y"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono tabular-nums font-bold text-black">
                  <span>
                    {activeWordCount}{' '}
                    {activeWordCount === 1
                      ? isPt
                        ? 'palavra'
                        : 'word'
                      : isPt
                        ? 'palavras'
                        : 'words'}{' '}
                    · {activeCharCount}{' '}
                    {isPt ? 'caracteres' : 'characters'}
                  </span>
                  <span>
                    {isPt ? 'Criada em' : 'Created'}:{' '}
                    {new Date(activeNote.createdAt).toLocaleString(isPt ? 'pt-BR' : 'en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl border-2 border-black bg-white flex items-center justify-center">
                <StickyNote size={26} className="text-black" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-base font-black text-black uppercase tracking-tight">
                  {isPt ? 'Seu Bloco de Notas Pessoal' : 'Your Personal Notepad'}
                </h2>
                <p className="text-xs text-black leading-relaxed">
                  {isPt
                    ? 'As anotações criadas aqui são independentes para cada aluno e ficam armazenadas diretamente no seu dispositivo.'
                    : 'Notes created here are independent per student and saved directly on your device.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide text-white cursor-pointer student-solid-btn mobile-only-neon-3d neon-tone-amber bg-black hover:bg-slate-800 border-2 border-black"
              >
                <Plus size={18} className="text-white" />
                <span>{isPt ? 'Criar Nova Anotação' : 'Create New Note'}</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
