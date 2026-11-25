import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertTriangle, ArrowRight, KeyRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AdminLoginPageProps {
  onLoginSuccess: (username: string, csrfToken: string) => void;
  onGoHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onGoHome
}) => {
  const { language } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.username, data.csrfToken);
      } else if (response.status === 429) {
        setLockoutSeconds(data.remainingSeconds || 900);
        setErrorMsg(
          data.error ||
            (language === 'uk'
              ? 'Забагато невдалих спроб. Вхід тимчасово заблоковано.'
              : 'Too many failed attempts. Temporary lockout active.')
        );
      } else {
        setErrorMsg(
          data.error ||
            (language === 'uk' ? 'Невірні облікові дані' : 'Invalid credentials')
        );
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(
        language === 'uk'
          ? 'Помилка з’єднання із сервером авторизації'
          : 'Failed to connect to authentication server'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full py-12 px-4 flex flex-col items-center justify-center select-none">
      <div className="comic-card max-w-md w-full p-6 sm:p-8 space-y-6 border-2 border-[#f6cf3f] shadow-2xl">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 mx-auto bg-[#0d1317] border-2 border-[#f6cf3f] text-[#f6cf3f] flex items-center justify-center transform -rotate-3 shadow">
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>

          <h1 className="font-impact text-3xl uppercase tracking-wide text-[#fff6c5] pt-2">
            {language === 'uk' ? 'Авторизація Власника' : 'System Owner Login'}
          </h1>
          <p className="text-xs text-zinc-300">
            {language === 'uk'
              ? 'Вхід до захищеної панелі керування MonoVoice Apps.'
              : 'Sign in to protected MonoVoice Apps administration panel.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-bold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#f6cf3f] uppercase tracking-wider block">
              {language === 'uk' ? 'Логін адміністратора' : 'Admin Username'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                required
                disabled={lockoutSeconds !== null}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/20 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#f6cf3f] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#f6cf3f] uppercase tracking-wider block">
              {language === 'uk' ? 'Пароль' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                disabled={lockoutSeconds !== null}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/20 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#f6cf3f] disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || lockoutSeconds !== null}
            className="comic-btn-yellow w-full py-3 text-xs sm:text-sm font-extrabold cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>{language === 'uk' ? 'Перевірка авторизації...' : 'Authenticating...'}</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{language === 'uk' ? 'Увійти в систему' : 'Authenticate'}</span>
              </>
            )}
          </button>
        </form>

        {/* Security Disclaimers */}
        <div className="pt-3 border-t border-white/10 space-y-2 text-[11px] text-zinc-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-[#f6cf3f] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'uk' ? 'Серверна система захисту:' : 'Server Security Guarantees:'}</span>
          </div>
          <ul className="space-y-1 pl-4 list-disc text-zinc-300">
            <li>{language === 'uk' ? 'Публічна реєстрація відсутня' : 'Public registration is disabled'}</li>
            <li>{language === 'uk' ? 'Шифрування кукі (HttpOnly + SameSite=Lax)' : 'HttpOnly + SameSite=Lax session cookies'}</li>
            <li>{language === 'uk' ? 'Блокування IP після 5 невдалих спроб' : 'IP lockout after 5 failed login attempts'}</li>
          </ul>
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onGoHome}
            className="text-xs text-zinc-400 hover:text-[#f6cf3f] underline cursor-pointer"
          >
            {language === 'uk' ? 'Повернутися на публічний сайт' : 'Return to Public Website'}
          </button>
        </div>
      </div>
    </div>
  );
};
