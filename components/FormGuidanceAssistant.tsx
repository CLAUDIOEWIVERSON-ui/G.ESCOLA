'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ChevronUp, 
  ChevronDown, 
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageContext';

interface EmptyFieldConsequence {
  fieldName: string;
  consequence: string;
  isCrucial: boolean;
}

export function FormGuidanceAssistant() {
  const { language } = useI18n();
  const [activeForm, setActiveForm] = useState<HTMLFormElement | null>(null);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const [emptyFields, setEmptyFields] = useState<EmptyFieldConsequence[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentAction, setRecentAction] = useState<string>('');
  const [completionPercent, setCompletionPercent] = useState<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define database field mapping, names & exact real-world consequences in PT/EN
  const getFieldGuidanceAndConsequences = useCallback((nameAttr: string, labelText: string): { 
    friendlyName: string; 
    guidance: string; 
    consequence: string; 
    isCrucial: boolean; 
  } => {
    const name = (nameAttr || '').toLowerCase();
    const label = (labelText || '').toLowerCase();

    // Check email
    if (name.includes('email') || label.includes('email') || label.includes('e-mail')) {
      return {
        friendlyName: language === 'pt' ? 'E-mail' : 'Email',
        guidance: language === 'pt' 
          ? 'Insira um endereço de e-mail institucional ou correto.' 
          : 'Enter a valid institutional or personal email address.',
        consequence: language === 'pt'
          ? 'Impossibilita o acesso à plataforma, recuperação de senhas, autenticação segura e envio de notificações automatizadas de faltas.'
          : 'Prevents platform access, secure password recovery, and receipt of automated attendance notifications.',
        isCrucial: true
      };
    }

    // Check full name
    if (name.includes('full_name') || label.includes('nome completo') || label.includes('nome civil') || (name === 'nome' && label.includes('nome'))) {
      return {
        friendlyName: language === 'pt' ? 'Nome Completo' : 'Full Name',
        guidance: language === 'pt'
          ? 'Preencha o nome completo oficial sem abreviações.'
          : 'Enter your official full name without abbreviations.',
        consequence: language === 'pt'
          ? 'O participante constará de forma oculta ou anônima em diários de classe, pautas de frequência, certificados e atas de avaliação.'
          : 'The participant will appear anonymously on class journals, attendance sheets, certificates, and grading sheets.',
        isCrucial: true
      };
    }

    // Check password
    if (name.includes('password') || name.includes('senha') || label.includes('senha')) {
      return {
        friendlyName: language === 'pt' ? 'Senha de Acesso' : 'Access Password',
        guidance: language === 'pt'
          ? 'Digite uma senha segura com no mínimo 6 caracteres.'
          : 'Choose a secure password of at least 6 characters.',
        consequence: language === 'pt'
          ? 'Sem uma chave de acesso segura cadastrada, o login inicial será bloqueado por razões de segurança regulamentar.'
          : 'Without a secure password set, initial login will remain blocked for compliance and security reasons.',
        isCrucial: true
      };
    }

    // Check grupo_responsavel
    if (name.includes('grupo') || label.includes('grupo') || label.includes('departamento')) {
      return {
        friendlyName: language === 'pt' ? 'Grupo Responsável' : 'Responsible Group',
        guidance: language === 'pt'
          ? 'Especifique o grupo de acompanhamento (Ex: MAN, GAT, AMBOS ou personalizado).'
          : 'Specify the coordination group (E.g.: MAN, GAT, BOTH or custom).',
        consequence: language === 'pt'
          ? 'O curso ou usuário ficará sem segmentação departamental nas consultas, impedindo filtros em pautas de escalas e notas.'
          : 'The course or user will lack department assignment, failing to show up on department-filtered schedules and grade rosters.',
        isCrucial: false
      };
    }

    // Check course_id
    if (name.includes('curso') || label.includes('curso')) {
      return {
        friendlyName: language === 'pt' ? 'Curso Vinculado' : 'Linked Course',
        guidance: language === 'pt'
          ? 'Associe esta turma ou evento a um curso da ementa cadastrada.'
          : 'Associate this group or event with an approved curriculum course.',
        consequence: language === 'pt'
          ? 'Inviabiliza a vinculação pedagógica, impossibilitando que os alunos herdem as matérias obrigatórias da grade curricular.'
          : 'Breaks pedagogical associations, preventing students from inheriting required subjects from the main curriculum.',
        isCrucial: true
      };
    }

    // Check turma_id
    if (name === 'turma_id' || label.includes('turma')) {
      return {
        friendlyName: language === 'pt' ? 'Turma' : 'Class/Group',
        guidance: language === 'pt'
          ? 'Selecione a turma correta que iniciará o período letivo.'
          : 'Select the class roster initialized for this academic period.',
        consequence: language === 'pt'
          ? 'Os alunos ficarão sem pauta física, impedindo o controle unificado de aproveitamento e o cálculo correto do boletim.'
          : 'Students will sit in an unassigned state, failing to sync with report cards and digital grading books.',
        isCrucial: true
      };
    }

    // Check instructor
    if (name.includes('instrutor') || label.includes('instrutor') || name.includes('instructor')) {
      return {
        friendlyName: language === 'pt' ? 'Instrutor' : 'Instructor',
        guidance: language === 'pt'
          ? 'Atribua um docente certificado a essa disciplina ou horário.'
          : 'Assign a certified instructor to this subject block or hours.',
        consequence: language === 'pt'
          ? 'A turma constará como sem tutor responsável, impossibilitando auditoria de preenchimento de diário de classe por terceiros.'
          : 'The class will showcase as leaderless, locked from class journal auditing and teacher coordination oversight.',
        isCrucial: false
      };
    }

    // Check dates
    if (name.includes('data_inicio') || label.includes('início') || label.includes('inicio') || name.includes('start_date')) {
      return {
        friendlyName: language === 'pt' ? 'Data de Início' : 'Start Date',
        guidance: language === 'pt'
          ? 'Insira a data do primeiro dia de instrução.'
          : 'Enter the calendar date for the first day of class.',
        consequence: language === 'pt'
          ? 'O cronograma ficará indefinido no calendário e as agendas de horários diários não serão exibidas corretamente.'
          : 'The educational timeline stays blank, hiding calendars and daily schedule rotations from target groups.',
        isCrucial: true
      };
    }

    if (name.includes('data_fim') || label.includes('fim') || label.includes('término') || name.includes('end_date')) {
      return {
        friendlyName: language === 'pt' ? 'Data de Término' : 'End Date',
        guidance: language === 'pt'
          ? 'Defina a data final prevista para o encerramento do curso.'
          : 'Define the target final date for course completion.',
        consequence: language === 'pt'
          ? 'Impossibilita o encerramento de vigência da vaga, mantendo o aluno alocado permanentemente e obstruindo novas turmas.'
          : 'Prevents seat expiration, locking enrolled students and obstructing the release of next-term semesters.',
        isCrucial: true
      };
    }

    // Check other common input tags
    return {
      friendlyName: labelText || nameAttr || (language === 'pt' ? 'Este Campo' : 'This Field'),
      guidance: language === 'pt'
        ? 'Preencha este campo com atenção para manter a integridade dos dados cadastrados.'
        : 'Please fill out this field with care to preserve system integrity.',
      consequence: language === 'pt'
        ? 'Dificultará buscas refinadas, relatórios gerenciais analíticos e poderá gerar validações pendentes ao salvar.'
        : 'Will hinder search queries and dashboard reports, potentially raising validation blockers during saves.',
      isCrucial: false
    };
  }, [language]);

  // Extract a human-readable name or label associated with the field
  const getLabelOrPlaceholder = useCallback((el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string => {
    // 1. Check if associated label exists
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl && labelEl.textContent) {
        return labelEl.textContent.trim().replace(/[*:]/g, '');
      }
    }
    // 2. Sibling label search
    const parentContainer = el.closest('div');
    if (parentContainer) {
      const labelEl = parentContainer.querySelector('label');
      if (labelEl && labelEl.textContent) {
        return labelEl.textContent.trim().replace(/[*:]/g, '');
      }
    }
    // 3. Fallback placeholder
    if (el.placeholder) {
      return el.placeholder;
    }
    // 4. Fallback name
    if (el.name) {
      return el.name;
    }
    return language === 'pt' ? 'Este Campo' : 'This Field';
  }, [language]);

  // Perform form structural analysis
  const analyzeFormState = useCallback((form: HTMLFormElement, active: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
    // Collect all typical input elements
    const elements = Array.from(form.querySelectorAll('input, select, textarea')) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
    
    // Ignore mechanical submit buttons, hidden inputs, search inputs
    const relevantElements = elements.filter(el => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      const isSearch = el.name === 'q' || el.classList.contains('pl-9');
      return el.tagName !== 'BUTTON' && type !== 'hidden' && type !== 'submit' && !isSearch;
    });

    if (relevantElements.length === 0) return;

    // Calculate completion progress
    const filledCount = relevantElements.filter(el => el.value && el.value.trim() !== '').length;
    const computedPercentage = Math.round((filledCount / relevantElements.length) * 100);
    setCompletionPercent(computedPercentage);

    // List empty fields other than the one currently focused
    const emptyList: EmptyFieldConsequence[] = [];
    relevantElements.forEach(el => {
      const parentIsHidden = el.closest('.hidden') || el.closest('[style*="display: none"]');
      if (parentIsHidden) return; // skip hidden screens/tabs

      // If it is currently empty
      if (!el.value || el.value.trim() === '') {
        const isCurrentlyActive = active && active === el;
        // Don't mark it as skipped or "pulado" if they are currently editing it
        if (!isCurrentlyActive) {
          const lText = getLabelOrPlaceholder(el);
          const nameAttr = el.getAttribute('name') || el.id || '';
          
          // Only show as skipped consequence if it has a label or name or it's crucial
          const info = getFieldGuidanceAndConsequences(nameAttr, lText);
          emptyList.push({
            fieldName: info.friendlyName,
            consequence: info.consequence,
            isCrucial: el.hasAttribute('required') || el.classList.contains('required') || info.isCrucial
          });
        }
      }
    });

    setEmptyFields(emptyList);
  }, [language, getLabelOrPlaceholder, getFieldGuidanceAndConsequences]);

  // Run on layout mounts
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'TEXTAREA'
      ) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }

        const inputEl = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const formEl = inputEl.form;

        setActiveInput(inputEl);
        if (formEl) {
          setActiveForm(formEl);
          analyzeFormState(formEl, inputEl);
        }
        setIsExpanded(true);
      }
    };

    const handleInputOrChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'TEXTAREA'
      ) {
        const inputEl = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const formEl = inputEl.form;

        if (inputEl.value.trim() !== '') {
          setRecentAction(
            language === 'pt' 
              ? `Digitando em "${getLabelOrPlaceholder(inputEl)}"... Obrigado!` 
              : `Typing in "${getLabelOrPlaceholder(inputEl)}"... Thank you!`
          );
        }

        if (formEl) {
          analyzeFormState(formEl, inputEl);
        }
      }
    };

    const handleFocusOut = () => {
      // Small timeout to guard against moving to another input in same form
      hideTimeoutRef.current = setTimeout(() => {
        // Only collapse gently if they took focus away from all inputs
        // Keep active form for context if they just hovered out
      }, 300);
    };

    // Attach global window listeners
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('input', handleInputOrChange);
    window.addEventListener('change', handleInputOrChange);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('input', handleInputOrChange);
      window.removeEventListener('change', handleInputOrChange);
      window.removeEventListener('focusout', handleFocusOut);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [language, getLabelOrPlaceholder, analyzeFormState]);

  if (!activeForm) return null;

  const currentLabel = activeInput ? getLabelOrPlaceholder(activeInput) : '';
  const currentInfo = activeInput ? getFieldGuidanceAndConsequences(activeInput.getAttribute('name') || '', currentLabel) : null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 font-sans max-w-[340px] md:max-w-md w-full print:hidden">
      <AnimatePresence>
        {!isExpanded ? (
          // Collapsed state - Subtle glowing badge
          <motion.button
            id="form-guide-collapsed"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 border border-white/10 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-colors float-right cursor-pointer"
          >
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'pt' ? 'Consulente de Formulário' : 'Form Assistant'}
            </span>
            {emptyFields.filter(f => f.isCrucial).length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            )}
            <ChevronUp size={14} className="text-slate-400" />
          </motion.button>
        ) : (
          // Expanded panel
          <motion.div
            id="form-guide-expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden shadow-black/80"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Sparkles size={14} className="text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-100">
                    {language === 'pt' ? 'Assistente de Validação' : 'Validation Assistant'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {language === 'pt' ? 'Apoio em Tempo Real' : 'Real-time Guidance'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10">
              
              {/* Progress Completion Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>{language === 'pt' ? 'Progresso do Cadastro' : 'Registration Progress'}</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                </div>
              </div>

              {/* Real-time Input Guidance */}
              {activeInput ? (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="text-xs font-semibold">
                      {language === 'pt' ? 'Preenchendo agora:' : 'Filling in:'}{' '}
                      <strong className="text-white font-black">{currentLabel}</strong>
                    </span>
                  </div>
                  {currentInfo && (
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      💡 {currentInfo.guidance}
                    </p>
                  )}
                  {recentAction && (
                    <motion.div 
                      key={recentAction}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1"
                    >
                      <CheckCircle2 size={10} /> {recentAction}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center py-5">
                  <HelpCircle size={18} className="mx-auto text-slate-500 mb-1.5 animate-bounce" />
                  <p className="text-[11px] text-slate-400 font-medium font-sans">
                    {language === 'pt' 
                      ? 'Selecione qualquer campo de formulário para iniciar a auditoria em tempo real.' 
                      : 'Select any form field to initialize real-time validation checks.'}
                  </p>
                </div>
              )}

              {/* Skipped Fields & Real Consequences Warning */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <AlertCircle size={12} className="text-amber-500" />
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {language === 'pt' ? 'Campos Não Preenchidos & Consequências' : 'Skipped Fields & Consequences'}
                  </h5>
                </div>

                {emptyFields.length > 0 ? (
                  <div className="space-y-2">
                    {emptyFields.map((field, idx) => (
                      <motion.div 
                        key={`${field.fieldName}-${idx}`}
                        layout
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                          field.isCrucial 
                            ? 'bg-red-500/5 border-red-500/20' 
                            : 'bg-amber-500/5 border-amber-500/15'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-100 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${field.isCrucial ? 'bg-red-500' : 'bg-amber-500'}`} />
                            {field.fieldName}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            field.isCrucial 
                              ? 'bg-red-500/10 text-red-400' 
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {field.isCrucial 
                              ? (language === 'pt' ? 'Obrigatório' : 'Required') 
                              : (language === 'pt' ? 'Filtro' : 'Optional')}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-relaxed font-medium ${field.isCrucial ? 'text-red-300' : 'text-amber-200/80'}`}>
                          ⚠️ <span className="font-bold">{language === 'pt' ? 'Se pular:' : 'If skipped:'}</span> {field.consequence}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-emerald-300 font-semibold leading-relaxed">
                      {language === 'pt' 
                        ? 'Excelente! Todas as informações essenciais deste formulário foram inseridas corretamente.' 
                        : 'Outstanding! All critical information in this form has been successfully completed.'}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer advice */}
            <div className="px-5 py-3 bg-white/[0.01] border-t border-white/5 text-[9px] text-slate-500 text-center font-bold uppercase tracking-wider">
              {language === 'pt' ? '🔒 Proteção de Integridade Ativa' : '🔒 Compliance Protection Active'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
