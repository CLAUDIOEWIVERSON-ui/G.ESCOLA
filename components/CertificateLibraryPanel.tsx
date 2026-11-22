'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  FolderOpen,
  Frame,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CertificateTemplateConfig } from '@/lib/certificateTypes';
import {
  CertificateAssetCategory,
  CertificateAssetTarget,
  CertificateLibraryAsset,
} from '@/lib/certificateLibrary';

interface CertificateLibraryPanelProps {
  assets: CertificateLibraryAsset[];
  template: CertificateTemplateConfig;
  activeCategory: CertificateAssetCategory;
  onChangeCategory: (cat: CertificateAssetCategory) => void;
  onClose: () => void;
  onApplyAsset: (asset: CertificateLibraryAsset, target: CertificateAssetTarget) => void;
  onUploadToLibrary: (
    category: CertificateAssetCategory,
    files: FileList | null,
    customName?: string
  ) => void;
  onDownloadAsset: (asset: CertificateLibraryAsset) => void;
  onRenameAsset?: (asset: CertificateLibraryAsset, newName: string) => void;
  onDeleteAsset: (asset: CertificateLibraryAsset) => void;
  hiddenAssetsCount?: number;
  onRestoreDefaultAssets?: () => void;
  canEdit: boolean;
}

const CATEGORY_TABS: Array<{
  id: CertificateAssetCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'brasao', label: 'Brasões', icon: Shield },
  { id: 'marca_dagua', label: "Marcas d'Água", icon: ImageIcon },
  { id: 'moldura', label: 'Molduras', icon: Frame },
];

export function CertificateLibraryPanel({
  assets,
  template,
  activeCategory,
  onChangeCategory,
  onClose,
  onApplyAsset,
  onUploadToLibrary,
  onDownloadAsset,
  onRenameAsset,
  onDeleteAsset,
  hiddenAssetsCount = 0,
  onRestoreDefaultAssets,
  canEdit,
}: CertificateLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  const handleStartRename = (asset: CertificateLibraryAsset) => {
    setEditingAssetId(asset.id);
    setEditingNameValue(asset.name);
  };

  const handleCommitRename = (asset: CertificateLibraryAsset) => {
    const trimmed = editingNameValue.trim();
    if (trimmed && trimmed !== asset.name && onRenameAsset) {
      onRenameAsset(asset, trimmed);
    }
    setEditingAssetId(null);
    setEditingNameValue('');
  };

  const handleCancelRename = () => {
    setEditingAssetId(null);
    setEditingNameValue('');
  };

  const counts = useMemo(() => {
    const map: Record<CertificateAssetCategory, number> = {
      brasao: 0,
      marca_dagua: 0,
      moldura: 0,
    };
    assets.forEach((a) => {
      if (map[a.category] !== undefined) map[a.category] += 1;
    });
    return map;
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((a) => {
      if (a.category !== activeCategory) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [assets, activeCategory, searchQuery]);

  const isAssetAppliedToTarget = (
    asset: CertificateLibraryAsset,
    target: CertificateAssetTarget
  ): boolean => {
    if (target === 'brasaoEsquerdo') {
      return Boolean(template.logoEsquerdaUrl) && template.logoEsquerdaUrl === asset.url;
    }
    if (target === 'brasaoCentro') {
      return Boolean(template.logoCentroUrl) && template.logoCentroUrl === asset.url;
    }
    if (target === 'brasaoDireito') {
      if (asset.isDefaultMarinhaCrest) {
        return !template.logoDireitaUrl && template.usarBrasaoPadraoDireita !== false;
      }
      return Boolean(template.logoDireitaUrl) && template.logoDireitaUrl === asset.url;
    }
    if (target === 'brasaoEsquerdoVerso') {
      const effectiveUrl =
        template.logoEsquerdaVersoUrl !== undefined
          ? template.logoEsquerdaVersoUrl
          : template.logoEsquerdaUrl;
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
    }
    if (target === 'brasaoCentroVerso') {
      const effectiveUrl =
        template.logoCentroVersoUrl !== undefined
          ? template.logoCentroVersoUrl
          : template.logoCentroUrl;
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
    }
    if (target === 'brasaoDireitoVerso') {
      const effectiveUrl =
        template.logoDireitaVersoUrl !== undefined
          ? template.logoDireitaVersoUrl
          : template.logoDireitaUrl;
      const allowDefault =
        template.usarBrasaoPadraoDireitaVerso !== undefined
          ? template.usarBrasaoPadraoDireitaVerso
          : template.usarBrasaoPadraoDireita !== false;
      if (asset.isDefaultMarinhaCrest) {
        return !effectiveUrl && allowDefault;
      }
      return Boolean(effectiveUrl) && effectiveUrl === asset.url;
    }
    if (target === 'marcaDaguaFrente') {
      return Boolean(template.marcaDaguaFrenteUrl) && template.marcaDaguaFrenteUrl === asset.url;
    }
    if (target === 'marcaDaguaVerso') {
      return Boolean(template.marcaDaguaVersoUrl) && template.marcaDaguaVersoUrl === asset.url;
    }
    if (target === 'marcaDaguaAmbas') {
      return (
        template.marcaDaguaFrenteUrl === asset.url &&
        template.marcaDaguaVersoUrl === asset.url
      );
    }
    if (target === 'molduraFrente') {
      const currentStyle =
        template.estiloMolduraFrente ??
        (template.usarMolduraOriginal !== false ? 'original' : 'vetorial');
      if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
        return currentStyle === asset.frameStyle;
      }
      return currentStyle === 'original' && template.molduraFrenteUrl === asset.url;
    }
    if (target === 'molduraVerso') {
      const currentStyle = template.estiloMolduraVerso ?? 'classica';
      if (asset.frameStyle === 'vetorial' || asset.frameStyle === 'simples') {
        return currentStyle === asset.frameStyle;
      }
      return (
        currentStyle === 'original' &&
        (template.molduraVersoUrl || template.molduraFrenteUrl) === asset.url
      );
    }
    return false;
  };

  return (
    <div className="flex flex-col max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
            <FolderOpen size={15} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
              Biblioteca de Recursos
            </h2>
            <p className="text-[10px] text-slate-500 truncate">
              Brasões, marcas d&apos;água e molduras com aplicação direta e download
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
          title="Fechar biblioteca (ESC)"
        >
          <X size={13} />
          <span>Fechar</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeCategory(tab.id)}
                className={cn(
                  'py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  active
                    ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon size={12} />
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[9px] font-black',
                    active ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar recursos por nome..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {canEdit && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-950">
                <Plus size={14} />
                <span>
                  Acrescentar{' '}
                  {activeCategory === 'brasao'
                    ? 'Brasão'
                    : activeCategory === 'marca_dagua'
                      ? "Marca d'Água"
                      : 'Moldura'}{' '}
                  à Biblioteca
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 leading-snug">
              Adicione novas imagens (PNG, SVG, JPG) para aplicar diretamente no certificado mantendo suas posições e configurações, ou baixar quando precisar.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Nome opcional (ex: Brasão Esquadra)"
                className="flex-1 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <label className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                <Upload size={13} />
                <span>Enviar Arquivo(s)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    onUploadToLibrary(activeCategory, e.target.files, newAssetName.trim() || undefined);
                    setNewAssetName('');
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-snug flex flex-wrap items-center justify-between gap-2">
          <span>
            Ao aplicar um recurso diretamente da biblioteca, tamanho, opacidade, legendas, cores, textos e alinhamentos configurados no modelo atual são preservados.
          </span>
          {canEdit && hiddenAssetsCount > 0 && onRestoreDefaultAssets && (
            <button
              type="button"
              onClick={onRestoreDefaultAssets}
              className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
              title="Restaurar itens removidos da biblioteca"
            >
              <RotateCcw size={10} />
              <span>Restaurar removidos ({hiddenAssetsCount})</span>
            </button>
          )}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
            <FolderOpen size={24} className="mx-auto text-slate-400" />
            <p>Nenhum recurso encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredAssets.map((asset) => {
              const sourceLabel =
                asset.source === 'builtin'
                  ? 'Padrão'
                  : asset.source === 'template'
                    ? 'De Modelo'
                    : 'Biblioteca';

              return (
                <div
                  key={asset.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-20 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 p-1.5',
                        activeCategory === 'moldura' && 'bg-white'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {editingAssetId === asset.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCommitRename(asset);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelRename();
                                  }
                                }}
                                autoFocus
                                className="flex-1 min-w-0 px-2 py-0.5 bg-slate-50 border border-blue-400 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Novo nome do recurso"
                              />
                              <button
                                type="button"
                                onClick={() => handleCommitRename(asset)}
                                className="p-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shrink-0"
                                title="Salvar novo nome (Enter)"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRename}
                                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                                title="Cancelar (ESC)"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-xs font-bold text-slate-900 truncate">
                                {asset.name}
                              </h3>
                              {asset.subtitle && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {asset.subtitle}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border',
                            asset.source === 'builtin'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : asset.source === 'template'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          )}
                        >
                          {sourceLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => onDownloadAsset(asset)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title={`Baixar "${asset.name}" para o computador`}
                        >
                          <Download size={11} />
                          <span>Download</span>
                        </button>

                        {canEdit && onRenameAsset && editingAssetId !== asset.id && (
                          <button
                            type="button"
                            onClick={() => handleStartRename(asset)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-blue-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title={`Renomear "${asset.name}"`}
                          >
                            <Pencil size={11} />
                            <span>Renomear</span>
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(asset)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title={`Excluir "${asset.name}" da biblioteca`}
                          >
                            <Trash2 size={11} />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">
                      Aplicar:
                    </span>
                    {activeCategory === 'brasao' && (
                      <>
                        {(
                          [
                            { target: 'brasaoEsquerdo' as const, label: 'Frente Esq.' },
                            { target: 'brasaoCentro' as const, label: 'Frente Central' },
                            { target: 'brasaoDireito' as const, label: 'Frente Dir.' },
                            { target: 'brasaoEsquerdoVerso' as const, label: 'Verso Esq.' },
                            { target: 'brasaoCentroVerso' as const, label: 'Verso Central' },
                            { target: 'brasaoDireitoVerso' as const, label: 'Verso Dir.' },
                          ] as const
                        ).map((btn) => {
                          const applied = isAssetAppliedToTarget(asset, btn.target);
                          return (
                            <button
                              key={btn.target}
                              type="button"
                              onClick={() => onApplyAsset(asset, btn.target)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border',
                                applied
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border-blue-200'
                              )}
                            >
                              {applied && <CheckCircle2 size={10} />}
                              <span>{btn.label}</span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {activeCategory === 'marca_dagua' && (
                      <>
                        {(
                          [
                            { target: 'marcaDaguaFrente' as const, label: 'Frente' },
                            { target: 'marcaDaguaVerso' as const, label: 'Verso' },
                            { target: 'marcaDaguaAmbas' as const, label: 'Frente e Verso' },
                          ] as const
                        ).map((btn) => {
                          const applied = isAssetAppliedToTarget(asset, btn.target);
                          return (
                            <button
                              key={btn.target}
                              type="button"
                              onClick={() => onApplyAsset(asset, btn.target)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border',
                                applied
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border-blue-200'
                              )}
                            >
                              {applied && <CheckCircle2 size={10} />}
                              <span>{btn.label}</span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {activeCategory === 'moldura' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onApplyAsset(asset, 'molduraFrente')}
                          className={cn(
                            'px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border',
                            isAssetAppliedToTarget(asset, 'molduraFrente')
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border-blue-200'
                          )}
                        >
                          {isAssetAppliedToTarget(asset, 'molduraFrente') && (
                            <CheckCircle2 size={10} />
                          )}
                          <span>Aplicar na Frente</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyAsset(asset, 'molduraVerso')}
                          className={cn(
                            'px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border',
                            isAssetAppliedToTarget(asset, 'molduraVerso')
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border-blue-200'
                          )}
                        >
                          {isAssetAppliedToTarget(asset, 'molduraVerso') && (
                            <CheckCircle2 size={10} />
                          )}
                          <span>Aplicar no Verso</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
