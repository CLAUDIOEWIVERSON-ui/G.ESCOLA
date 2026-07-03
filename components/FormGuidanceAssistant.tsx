'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageContext';

interface EmptyFieldConsequence {
  fieldName: string;
  consequence: string;
  isCrucial: boolean;
}

function WizardAvatar({ onClick, isGlow }: { onClick: () => void; isGlow: boolean }) {
  return (
    <div 
      id="wizard-consultant-avatar"
      onClick={onClick}
      className="relative cursor-pointer select-none group focus:outline-none transition-transform active:scale-95"
      role="button"
      aria-label="Form Consultant Wizard"
    >
      {/* Magic float sparks */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping opacity-75" style={{ animationDelay: '0s' }} />
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping opacity-60" style={{ animationDelay: '0.4s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping opacity-90" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* Pulsar Ambient Ring */}
      <div className={`absolute inset-[-4px] rounded-full bg-gradient-to-r from-indigo-500/20 via-cyan-500/10 to-purple-500/20 blur-lg transition-all duration-750 ${isGlow ? 'opacity-100 scale-125' : 'opacity-30'}`} />

      {/* Main Avatar Circle */}
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-indigo-505/30 bg-slate-950/80 backdrop-blur-sm shadow-xl flex items-center justify-center overflow-visible group-hover:border-indigo-400 transition-all">
        <svg 
          viewBox="0 0 100 100" 
          className="w-[90%] h-[90%] overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          style={{
            animation: 'wizardFloat 4s ease-in-out infinite'
          }}
        >
          <defs>
            <radialGradient id="crystalBallGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0f7fa" />
              <stop offset="35%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
            <linearGradient id="wizardRobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
            <linearGradient id="wizardStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          {/* Robe body */}
          <path 
            d="M 32 80 Q 50 63 68 80 Z" 
            fill="url(#wizardRobeGrad)" 
            stroke="#4338ca" 
            strokeWidth="0.75"
          />

          {/* Skin Face */}
          <circle cx="50" cy="56" r="13" fill="#fed7aa" />

          {/* Beard */}
          <path 
            d="M 38 59 C 38 78 50 84 50 84 C 50 84 62 78 62 59 Q 50 64 38 59" 
            fill="#f8fafc" 
            stroke="#e2e8f0" 
            strokeWidth="0.5" 
          />

          {/* Mustache */}
          <path 
            d="M 43 59 Q 50 62 57 59 Q 50 64 43 59" 
            fill="#e2e8f0" 
          />

          {/* Eyes - Mystical cute closed eyes */}
          <path d="M 44 53 Q 46 51 48 53" stroke="#1e293b" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          <path d="M 52 53 Q 54 51 56 53" stroke="#1e293b" strokeWidth="1.25" strokeLinecap="round" fill="none" />
          
          {/* Cheeks */}
          <circle cx="42" cy="56" r="1.5" fill="#f43f5e" opacity="0.5" />
          <circle cx="58" cy="56" r="1.5" fill="#f43f5e" opacity="0.5" />

          {/* Hat Brim */}
          <path 
            d="M 30 47 Q 50 44 70 47 C 65 48.5 35 48.5 30 47 Z" 
            fill="#312e81" 
            stroke="#4338ca"
            strokeWidth="0.5"
          />

          {/* Wizard Hat Cone */}
          <path 
            d="M 33 46 Q 51 17 49 11 Q 52 17 67 46 Z" 
            fill="url(#wizardRobeGrad)" 
            stroke="#4338ca"
            strokeWidth="0.5"
          />

          {/* Stars on Hat */}
          <path 
            d="M 49 11 L 50 13 L 52 13.5 L 50.5 15 L 51 17 L 49 16 L 47 17 L 47.5 15 L 46 13.5 L 48 13 Z" 
            fill="url(#wizardStarGrad)" 
          />
          <path 
            d="M 37 32 L 38 34 L 40 34 L 38.5 35 L 39 37 L 37 36 L 35 37 L 35.5 35 L 34 34 L 36 34 Z" 
            fill="url(#wizardStarGrad)" 
            transform="scale(0.7) translate(13, 10)"
          />

          {/* Pedestal & Glowing Crystal ball */}
          <g>
            <path d="M 43 83 L 57 83 L 55 79 L 45 79 Z" fill="#334155" stroke="#1e293b" strokeWidth="0.5" />
            <circle 
              cx="50.1" 
              cy="75.2" 
              r="8.5" 
              fill="url(#crystalBallGlow)" 
              style={{
                animation: 'wizardBallGlow 2.5s ease-in-out infinite'
              }}
            />
          </g>
        </svg>

        {/* Floating and pulse css */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes wizardFloat {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-7px) scale(0.98); }
          }
          @keyframes wizardBallGlow {
            0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 3px rgba(34,211,238,0.5)) drop-shadow(0 0 6px rgba(99,102,241,0.3)); }
            50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(34,211,238,0.95)) drop-shadow(0 0 12px rgba(99,102,241,0.6)); }
          }
        `}} />
      </div>
    </div>
  );
}

export function FormGuidanceAssistant() {
  const { language } = useI18n();
  const [activeForm, setActiveForm] = useState<HTMLFormElement | null>(null);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const [emptyFields, setEmptyFields] = useState<EmptyFieldConsequence[]>([]);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [autoTriggerAllowed, setAutoTriggerAllowed] = useState(true);
  const [recentAction, setRecentAction] = useState<string>('');
  const [completionPercent, setCompletionPercent] = useState<number>(0);

  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep state refs to avoid stale closures inside event listeners
  const autoTriggerAllowedRef = useRef(autoTriggerAllowed);
  const bubbleVisibleRef = useRef(bubbleVisible);

  useEffect(() => {
    autoTriggerAllowedRef.current = autoTriggerAllowed;
  }, [autoTriggerAllowed]);

  useEffect(() => {
    bubbleVisibleRef.current = bubbleVisible;
  }, [bubbleVisible]);

  // Clear 5-second auto hide timer
  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  // Set 5-second auto hide timer
  const startAutoHideTimer = useCallback(() => {
    clearAutoHideTimer();
    autoHideTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 5000);
  }, [clearAutoHideTimer]);

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
          ? 'Impossibilita o acesso à plataforma, recuperação de senhas e autenticação segura.'
          : 'Prevents platform access, secure password recovery, and login.',
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
          ? 'O participante constará de forma oculta ou anônima em diários e certificados.'
          : 'The participant will appear anonymously on classes and certificates.',
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
          ? 'O login será bloqueado por razões de segurança regulamentar.'
          : 'Account access will remain locked for security protection.',
        isCrucial: true
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
          ? 'Alunos não herdarão as matérias e módulos obrigatórios corretamente.'
          : 'Students will fail to inherit required subject modules correctly.',
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
          ? 'Os alunos ficarão sem pauta e sem cálculo automático do boletim.'
          : 'Students will sit in an unassigned state and fail to sync with report cards.',
        isCrucial: true
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
          ? 'O cronograma ficará indefinido no calendário e na agenda de horários.'
          : 'The educational timeline stays blank under schedules.',
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
          ? 'Mantém o aluno alocado permanentemente, impedindo novas matrículas.'
          : 'Prevents seat expiration, locking enrolled students indefinitely.',
        isCrucial: true
      };
    }

    // Check other common input tags
    return {
      friendlyName: labelText || nameAttr || (language === 'pt' ? 'Este Campo' : 'This Field'),
      guidance: language === 'pt'
        ? 'Preencha este campo com atenção para manter a integridade dos dados.'
        : 'Please fill out this field with care to preserve system integrity.',
      consequence: language === 'pt'
        ? 'Dificultará buscas refinadas e relatórios gerenciais analíticos.'
        : 'Will hinder search queries and analytical dashboard reports.',
      isCrucial: false
    };
  }, [language]);

  // Extract a human-readable name or label associated with the field
  const getLabelOrPlaceholder = useCallback((el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string => {
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl && labelEl.textContent) {
        return labelEl.textContent.trim().replace(/[*:]/g, '');
      }
    }
    const parentContainer = el.closest('div');
    if (parentContainer) {
      const labelEl = parentContainer.querySelector('label');
      if (labelEl && labelEl.textContent) {
        return labelEl.textContent.trim().replace(/[*:]/g, '');
      }
    }
    if ('placeholder' in el && (el as any).placeholder) {
      return (el as any).placeholder;
    }
    if (el.name) {
      return el.name;
    }
    return language === 'pt' ? 'Este Campo' : 'This Field';
  }, [language]);

  // Perform form structural analysis
  const analyzeFormState = useCallback((form: HTMLFormElement, active: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
    const elements = Array.from(form.querySelectorAll('input, select, textarea')) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
    
    // Ignore mechanical buttons, hidden inputs, search boxes
    const relevantElements = elements.filter(el => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      const isSearch = el.name === 'q' || el.classList.contains('pl-9') || el.id?.includes('search');
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
      if (parentIsHidden) return; 

      if (!el.value || el.value.trim() === '') {
        const isCurrentlyActive = active && active === el;
        // Don't mark it as skipped if editing it
        if (!isCurrentlyActive) {
          const lText = getLabelOrPlaceholder(el);
          const nameAttr = el.getAttribute('name') || el.id || '';
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
  }, [getLabelOrPlaceholder, getFieldGuidanceAndConsequences]);

  // Automatic form scan to reveal the Wizard whenever a form is present on the screen
  useEffect(() => {
    const scanForActiveForm = () => {
      const forms = document.querySelectorAll('form');
      const standardForm = Array.from(forms).find(form => {
        const isSearch = form.getAttribute('role') === 'search' || form.id?.includes('search');
        return !isSearch;
      });

      if (standardForm) {
        setActiveForm(standardForm as HTMLFormElement);
        analyzeFormState(standardForm as HTMLFormElement, activeInput);
      } else {
        setActiveForm(null);
        setActiveInput(null);
      }
    };

    scanForActiveForm();

    const interval = setInterval(scanForActiveForm, 1000);
    const observer = new MutationObserver(scanForActiveForm);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [activeInput, analyzeFormState]);

  // Handle focus, type, and change event auditing globally
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
          
          // Fulfill original requirement: Clicking/focusing on form fields automatically displays layout for 5s
          if (autoTriggerAllowedRef.current) {
            setBubbleVisible(true);
            startAutoHideTimer();
            setAutoTriggerAllowed(false);
          }
        }
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
          
          // Ensure typing also auto-reveals the bubble for 5 seconds if not triggered yet
          if (autoTriggerAllowedRef.current) {
            setBubbleVisible(true);
            startAutoHideTimer();
            setAutoTriggerAllowed(false);
          }
        }
      }
    };

    const handleFocusOut = () => {
      hideTimeoutRef.current = setTimeout(() => {
        // Keep active form for background contexts, soft blur
      }, 300);
    };

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
  }, [language, getLabelOrPlaceholder, analyzeFormState, startAutoHideTimer]);

  // Toggle bubble manually by clicking directly on the avatar
  const toggleBubbleManual = useCallback(() => {
    setBubbleVisible(prev => {
      const nextValue = !prev;
      if (nextValue) {
        // Clear active 5-second auto hide timer so the user can keep it open while reading
        clearAutoHideTimer();
      } else {
        // Re-enable automatic trigger next time they interact with forms if they manually dismissed
        setAutoTriggerAllowed(true);
      }
      return nextValue;
    });
  }, [clearAutoHideTimer]);

  if (!activeForm) return null;

  const currentLabel = activeInput ? getLabelOrPlaceholder(activeInput) : '';
  const currentInfo = activeInput ? getFieldGuidanceAndConsequences(activeInput.getAttribute('name') || '', currentLabel) : null;

  return (
    <div className="fixed bottom-24 md:bottom-8 right-8 z-50 font-sans max-w-[320px] md:max-w-[360px] w-full print:hidden">
      <div className="relative flex flex-col items-end">
        <AnimatePresence>
          {bubbleVisible && (
            <motion.div
              id="wizard-speech-bubble"
              initial={{ opacity: 0, y: 15, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 24 }}
              className="w-full bg-slate-950/95 text-white rounded-[24px] border border-indigo-500/30 shadow-2xl overflow-hidden p-4 mb-3 relative flex flex-col gap-3.5 backdrop-blur-md shadow-indigo-500/20"
            >
              {/* Top Row / Header */}
              <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-405 text-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300">
                    {language === 'pt' ? 'Mago Consultor' : 'Wizard Advisor'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setBubbleVisible(false);
                    setAutoTriggerAllowed(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={language === 'pt' ? 'Fechar' : 'Close'}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Completion Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>{language === 'pt' ? 'Progresso do Cadastro' : 'Form Completion'}</span>
                  <span className="text-cyan-400 font-extrabold">{completionPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                  />
                </div>
              </div>

              {/* Active Input Guidance or General Help */}
              {activeInput ? (
                <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] leading-relaxed text-slate-200">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{language === 'pt' ? 'Campo Atual:' : 'Active Input:'} <strong className="text-white normal-case">{currentLabel}</strong></span>
                  </div>
                  {currentInfo && (
                    <p className="font-medium text-slate-300">
                       💡 {currentInfo.guidance}
                    </p>
                  )}
                  {recentAction && (
                    <motion.div 
                      key={recentAction}
                      initial={{ opacity: 0, y: 1 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1.5"
                    >
                      <CheckCircle2 size={10} /> {recentAction}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/10 text-center py-3.5">
                  <p className="text-[11px] text-slate-300 font-medium italic">
                    {language === 'pt' 
                      ? '"Preencha os campos com sabedoria! Revelarei as consequências do preenchimento através da minha bola de cristal..."' 
                      : '"Fill in the fields with wisdom! I will peek into my crystal ball to reveal compliance rules..."'}
                  </p>
                </div>
              )}

              {/* Empty Fields & Warnings */}
              {emptyFields.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                    {language === 'pt' ? 'Campos Pendentes Importantes:' : 'Pending Critical Fields:'}
                  </span>
                  <div className="max-h-[110px] overflow-y-auto pr-0.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                    {emptyFields.slice(0, 3).map((field, idx) => (
                      <div 
                        key={`${field.fieldName}-${idx}`}
                        className={`p-2 rounded-lg border text-[10px] ${
                          field.isCrucial 
                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-200' 
                            : 'bg-amber-500/5 border-amber-500/10 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-0.5">
                          <span>{field.fieldName}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-80">
                            {field.isCrucial 
                              ? (language === 'pt' ? 'obrigatório' : 'required') 
                              : (language === 'pt' ? 'filtro' : 'optional')}
                          </span>
                        </div>
                        <p className="text-[9px] opacity-90 leading-normal">
                          ⚠️ <span className="font-bold">{language === 'pt' ? 'Se pular:' : 'If skipped:'}</span> {field.consequence}
                        </p>
                      </div>
                    ))}
                    {emptyFields.length > 3 && (
                      <div className="text-center text-[9px] font-black uppercase tracking-widest text-indigo-400/80 mt-1 animate-pulse">
                        {language === 'pt' ? `e mais ${emptyFields.length - 3} importantes` : `and ${emptyFields.length - 3} more`}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-emerald-300 font-bold leading-normal">
                    {language === 'pt' 
                      ? 'Incrível! Todas as informações essenciais estão preenchidas!' 
                      : 'Outstanding! Form fully completed with precision!'}
                  </p>
                </div>
              )}

              {/* Speech bubble tail pointing directly down to the avatar */}
              <div className="absolute bottom-[-6px] right-8 w-3 h-3 bg-slate-950 border-r border-b border-indigo-500/30 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Avatar with crystal ball */}
        <WizardAvatar 
          onClick={toggleBubbleManual} 
          isGlow={bubbleVisible || emptyFields.filter(f => f.isCrucial).length > 0} 
        />
      </div>
    </div>
  );
}
