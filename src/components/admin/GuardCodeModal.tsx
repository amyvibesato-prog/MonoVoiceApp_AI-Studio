import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Clock, AlertTriangle, ArrowRight, X, Smartphone } from 'lucide-react';

interface GuardCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void> | void;
  actionTitle: string;
  targetLabel: string;
  actionType: string;
  csrfToken?: string;
}

export const GuardCodeModal: React.FC<GuardCodeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionTitle,
  targetLabel,
  actionType,
  csrfToken
}) => {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset and start 15s timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setTimeLeft(15);
      setErrorMessage(null);
      setIsExpired(false);
      setIsSubmitting(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleTimeout = async () => {
    setIsExpired(true);
    setErrorMessage('Час (15 секунд) вийшов! Спробу зафіксовано в журналі інцидентів.');

    // Record security incident on server
    try {
      await fetch('/api/admin/guard/record-incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        body: JSON.stringify({
          actionType,
          targetLabel,
          reason: 'EXPIRED_TIMEOUT',
          details: `Час на введення коду (15 сек) для дії "${actionTitle}" (${targetLabel}) вичерпано.`
        })
      });
    } catch (e) {
      console.warn('Failed to report guard timeout:', e);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isExpired || timeLeft <= 0) return;

    const cleanCode = code.replace(/[\s-]/g, '').trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Введіть 6 цифр із додатку');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onConfirm(cleanCode);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Недійсний код. Перевірте додаток MonoVoice Guard');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const progressPct = ((15 - timeLeft) / 15) * 100;
  const strokeDashoffset = 126 - (126 * (15 - timeLeft)) / 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Top Cyber Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                MonoVoice Guard
              </h3>
              <p className="text-xs text-amber-400/90 font-medium">
                Підтвердження безпеки (Steam Guard режим)
              </p>
            </div>
          </div>

          {/* Action Context Box */}
          <div className="mb-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="text-slate-400 mb-1">Дія, що потребує підтвердження:</div>
            <div className="text-slate-200 font-semibold truncate text-sm">
              {actionTitle}: <span className="text-amber-300">{targetLabel}</span>
            </div>
          </div>

          {/* 15-Second Circular Progress Ring & Timer */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className={`transition-all duration-1000 ease-linear ${
                    timeLeft <= 5 ? 'stroke-red-500' : 'stroke-amber-400'
                  }`}
                  strokeWidth="6"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 - (238.76 * timeLeft) / 15}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span
                  className={`text-2xl font-black ${
                    timeLeft <= 5 ? 'text-red-400 animate-ping' : 'text-amber-400'
                  }`}
                >
                  {timeLeft}s
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Таймер
                </span>
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-400 text-center">
              {isExpired ? (
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Час вичерпано (15 сек)
                </span>
              ) : (
                <span>Відкрийте додаток та введіть код до закінчення таймера</span>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Одноразовий 6-значний код
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                disabled={isExpired || isSubmitting}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                  setErrorMessage(null);
                  if (val.length === 6) {
                    setTimeout(() => handleSubmit(), 50);
                  }
                }}
                placeholder="••• •••"
                className="w-full text-center text-3xl font-mono tracking-[0.35em] py-3 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isExpired || isSubmitting || code.length !== 6}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:shadow-none transition"
              >
                {isSubmitting ? (
                  <span>Перевірка…</span>
                ) : (
                  <>
                    <span>Підтвердити</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
