import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  Clock,
  Copy,
  Check,
  Download,
  AlertCircle,
  MapPin,
  Globe,
  Trash2,
  Phone
} from 'lucide-react';

interface GuardStatus {
  isPaired: boolean;
  phoneNumber: string | null;
  deviceName: string | null;
  pairedAt: string | null;
}

interface SecurityIncident {
  id: string;
  timestamp: string;
  clientIp: string;
  location: string;
  userAgent: string;
  actionType: string;
  targetLabel: string;
  reason: 'EXPIRED_TIMEOUT' | 'INVALID_CODE' | 'BLOCKED_ATTEMPT';
  details: string;
}

interface DeviceAuthTabProps {
  csrfToken: string;
}

export const DeviceAuthTab: React.FC<DeviceAuthTabProps> = ({ csrfToken }) => {
  const [guardStatus, setGuardStatus] = useState<GuardStatus>({
    isPaired: false,
    phoneNumber: null,
    deviceName: null,
    pairedAt: null
  });
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Pairing Modal State
  const [showPairModal, setShowPairModal] = useState(false);
  const [inputPhone, setInputPhone] = useState('+380');
  const [inputDeviceName, setInputDeviceName] = useState('Мій Смартфон');
  const [isInitializingPair, setIsInitializingPair] = useState(false);
  const [pairingData, setPairingData] = useState<{
    secretKey: string;
    qrUri: string;
    recoveryCode: string;
    phoneNumber: string;
    qrDataUrl?: string;
  } | null>(null);
  const [initialCodeInput, setInitialCodeInput] = useState('');
  const [isConfirmingPair, setIsConfirmingPair] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Unpair Modal State
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [unpairRecoveryCode, setUnpairRecoveryCode] = useState('');
  const [unpairActionPassword, setUnpairActionPassword] = useState('');
  const [isUnpairing, setIsUnpairing] = useState(false);

  // Test Code Modal State
  const [testCodeInput, setTestCodeInput] = useState('');
  const [testCodeResult, setTestCodeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingCode, setIsTestingCode] = useState(false);

  // Stage 1 Connectivity Test Status (Preserved from legacy test)
  const [connTestStatus, setConnTestStatus] = useState<{
    status: 'NO_TEST_RECEIVED' | 'SUCCESS';
    lastResult: any;
  }>({ status: 'NO_TEST_RECEIVED', lastResult: null });

  const fetchGuardStatus = async () => {
    try {
      const res = await fetch('/api/admin/guard/status');
      if (res.ok) {
        const data = await res.json();
        setGuardStatus({
          isPaired: Boolean(data.isPaired),
          phoneNumber: data.phoneNumber,
          deviceName: data.deviceName,
          pairedAt: data.pairedAt
        });
      }
    } catch (e) {
      console.warn('Failed to fetch Guard status:', e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/admin/guard/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (e) {
      console.warn('Failed to fetch incidents:', e);
    }
  };

  const fetchConnTest = async () => {
    try {
      const res = await fetch('/api/admin/device-auth/connectivity-test/latest');
      if (res.ok) {
        const data = await res.json();
        setConnTestStatus({ status: data.status, lastResult: data.lastResult });
      }
    } catch (e) {}
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchGuardStatus(), fetchIncidents(), fetchConnTest()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchGuardStatus();
      fetchIncidents();
      fetchConnTest();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim() || inputPhone.trim().length < 9) {
      setActionMsg({ type: 'error', text: 'Вкажіть дійсний номер телефону (наприклад: +380971234567)' });
      return;
    }

    try {
      setIsInitializingPair(true);
      const res = await fetch('/api/admin/guard/pair/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          phoneNumber: inputPhone.trim(),
          deviceName: inputDeviceName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Помилка ініціалізації зв’язки');
      }

      const qrDataUrl = await QRCode.toDataURL(data.qrUri, {
        width: 320,
        margin: 2,
        color: { dark: '#020617', light: '#f59e0b' }
      });

      setPairingData({
        secretKey: data.secretKey,
        qrUri: data.qrUri,
        recoveryCode: data.recoveryCode,
        phoneNumber: data.phoneNumber,
        qrDataUrl
      });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Помилка генерації коду прив’язки' });
    } finally {
      setIsInitializingPair(false);
    }
  };

  const handleConfirmPairing = async () => {
    if (!pairingData || !initialCodeInput.trim()) {
      setActionMsg({ type: 'error', text: 'Введіть 6-значний код із додатку' });
      return;
    }

    try {
      setIsConfirmingPair(true);
      const res = await fetch('/api/admin/guard/pair/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          secretKey: pairingData.secretKey,
          phoneNumber: pairingData.phoneNumber,
          recoveryCode: pairingData.recoveryCode,
          deviceName: inputDeviceName.trim(),
          initialCode: initialCodeInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Помилка підтвердження коду');
      }

      setActionMsg({ type: 'success', text: '🎉 MonoVoice Guard успішно активовано! Зміни на сайті захищено.' });
      setShowPairModal(false);
      setPairingData(null);
      setInitialCodeInput('');
      fetchGuardStatus();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Помилка перевірки' });
    } finally {
      setIsConfirmingPair(false);
    }
  };

  const handleUnpair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unpairRecoveryCode.trim() && !unpairActionPassword.trim()) {
      setActionMsg({ type: 'error', text: 'Введіть Recovery Code або пароль дії' });
      return;
    }

    try {
      setIsUnpairing(true);
      const res = await fetch('/api/admin/guard/unpair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          recoveryCode: unpairRecoveryCode.trim() || undefined,
          actionPassword: unpairActionPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Помилка від’єднання');
      }

      setActionMsg({ type: 'success', text: 'Пристрій успішно від’єднано.' });
      setShowUnpairModal(false);
      setUnpairRecoveryCode('');
      setUnpairActionPassword('');
      fetchGuardStatus();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Помилка' });
    } finally {
      setIsUnpairing(false);
    }
  };

  const handleTestCode = async () => {
    if (!testCodeInput.trim()) return;
    try {
      setIsTestingCode(true);
      setTestCodeResult(null);
      const res = await fetch('/api/admin/guard/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCodeInput.trim(),
          actionType: 'MANUAL_TEST',
          targetLabel: 'Тестова перевірка'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestCodeResult({ success: true, message: 'Код дійсний та актуальний! (15с вікно збігається)' });
      } else {
        setTestCodeResult({ success: false, message: data.error || 'Недійсний код' });
      }
      fetchIncidents();
    } catch (err: any) {
      setTestCodeResult({ success: false, message: err.message || 'Помилка виклику' });
    } finally {
      setIsTestingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : actionMsg.type === 'error'
              ? 'bg-red-950/60 border-red-500/50 text-red-300'
              : 'bg-blue-950/60 border-blue-500/50 text-blue-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="ml-4 font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Main Status Hero Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${
                guardStatus.isPaired
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              }`}
            >
              {guardStatus.isPaired ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-wide">
                  MonoVoice Guard
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    guardStatus.isPaired
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {guardStatus.isPaired ? 'Захист Активовано' : 'Очікує прив’язки'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-mono font-semibold border border-slate-700">
                  15с Steam Guard Mode
                </span>
              </div>

              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                {guardStatus.isPaired
                  ? `Прив’язано до номера ${guardStatus.phoneNumber}. Усі зміни проєктів та бекапів блокуються до введення 15-секундного коду з вашого додатку.`
                  : 'Підключіть Android-додаток MonoVoice Guard за номером телефону для обов’язкового 15-секундного підтвердження будь-яких змін на сайті.'}
              </p>

              {guardStatus.isPaired && guardStatus.pairedAt && (
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    Пристрій: <b className="text-slate-200">{guardStatus.deviceName || 'Android'}</b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Дата зв’язки: <b className="text-slate-200">{new Date(guardStatus.pairedAt).toLocaleString('uk-UA')}</b>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={refreshAll}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Оновити статус"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {guardStatus.isPaired ? (
              <button
                onClick={() => setShowUnpairModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-bold text-sm flex items-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Від’єднати пристрій</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setPairingData(null);
                  setShowPairModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Прив’язати додаток MonoVoice Guard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Test Authenticator Code + Connectivity Stage 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Guard Code Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 mb-3">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Перевірка коду додатка</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Введіть поточний 6-значний код із додатку MonoVoice Guard для миттєвої перевірки синхронізації 15-секундного таймера.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={testCodeInput}
              onChange={(e) => setTestCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="flex-1 py-2 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono tracking-widest text-center text-lg focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleTestCode}
              disabled={isTestingCode || testCodeInput.length !== 6 || !guardStatus.isPaired}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition"
            >
              {isTestingCode ? '…' : 'Перевірити'}
            </button>
          </div>

          {testCodeResult && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs border ${
                testCodeResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              {testCodeResult.message}
            </div>
          )}
        </div>

        {/* Preserved Stage 1 Connectivity Diagnostic Status */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 mb-3">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Тест зв’язку із сервером (Stage 1)</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Фіксація тестового діагностичного сигналу з додатку (`/connectivity-test`).
          </p>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">Останній сигнал:</span>
            {connTestStatus.status === 'SUCCESS' && connTestStatus.lastResult ? (
              <span className="text-emerald-400 font-bold">
                Отримано ({new Date(connTestStatus.lastResult.receivedAt).toLocaleTimeString('uk-UA')})
              </span>
            ) : (
              <span className="text-slate-500">Сигналів не зафіксовано</span>
            )}
          </div>
        </div>
      </div>

      {/* Security Incidents & Failures History Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Журнал зафіксованих дій та інцидентів</h3>
              <p className="text-xs text-slate-400">
                Коли і де було зафіксовано спробу збереження, якщо 15-секундний час вийшов або код був недійсним.
              </p>
            </div>
          </div>

          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            Записів: {incidents.length}
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            Порушень або прострочених спроб не зафіксовано. Усі операції захищено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase tracking-wider text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Час фіксації</th>
                  <th className="py-3 px-4">Місце / Локація</th>
                  <th className="py-3 px-4">IP-адреса</th>
                  <th className="py-3 px-4">Цільова дія</th>
                  <th className="py-3 px-4">Причина зупинки</th>
                  <th className="py-3 px-4">Деталі</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(inc.timestamp).toLocaleString('uk-UA')}
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-sans font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {inc.location || 'Невідомо'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{inc.clientIp}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      {inc.actionType} ({inc.targetLabel})
                    </td>
                    <td className="py-3 px-4">
                      {inc.reason === 'EXPIRED_TIMEOUT' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                          ⏳ ЧАС (15с) ВИЙШОВ
                        </span>
                      ) : inc.reason === 'INVALID_CODE' ? (
                        <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-bold">
                          ❌ НЕВІРНИЙ КОД
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          ЗАБЛОКОВАНО
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400 text-[11px] max-w-xs truncate" title={inc.details}>
                      {inc.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-amber-400" />
              Прив’язка додатку MonoVoice Guard
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Модель Steam Guard: одноразовий конект за номером телефону. Застосунок генеруватиме 15-секундний код для кожного збереження.
            </p>

            {!pairingData ? (
              <form onSubmit={handleStartPairing} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ваш номер телефону
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="+380971234567"
                      className="w-full py-2.5 pl-9 pr-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Назва вашого пристрою
                  </label>
                  <input
                    type="text"
                    value={inputDeviceName}
                    onChange={(e) => setInputDeviceName(e.target.value)}
                    placeholder="Samsung S24 / Pixel 8"
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPairModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={isInitializingPair}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl"
                  >
                    {isInitializingPair ? 'Генерація…' : 'Далі (QR-код) →'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  {pairingData.qrDataUrl && (
                    <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl shadow-md">
                      <img
                        src={pairingData.qrDataUrl}
                        alt="QR Code"
                        className="w-56 h-56 rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-amber-300 mt-2 font-medium">
                    Відкрийте додаток MonoVoice Guard та відскануйте цей QR-код
                  </p>
                </div>

                {/* Recovery Code Display */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
                  <div className="text-slate-400 mb-1 font-semibold">Ваш аварійний Recovery Code:</div>
                  <div className="flex items-center justify-between font-mono text-sm font-bold text-amber-400">
                    <span>{pairingData.recoveryCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pairingData.recoveryCode);
                        setCopiedRecovery(true);
                        setTimeout(() => setCopiedRecovery(false), 2000);
                      }}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      {copiedRecovery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRecovery ? 'Скопійовано' : 'Копіювати'}</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Збережіть цей код. Він дозволить відв’язати систему, якщо телефон буде втрачено.
                  </div>
                </div>

                {/* Initial 6-digit confirmation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Введіть перший 6-значний код із додатку (для завершення):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={initialCodeInput}
                    onChange={(e) => setInitialCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••• •••"
                    className="w-full text-center text-2xl font-mono tracking-widest py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPairingData(null);
                      setShowPairModal(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPairing}
                    disabled={isConfirmingPair || initialCodeInput.length !== 6}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl"
                  >
                    {isConfirmingPair ? 'Перевірка…' : 'Підтвердити зв’язку'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unpair Modal */}
      {showUnpairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/60 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Від’єднання MonoVoice Guard
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Вкажіть ваш аварійний Recovery Code (R-XXXXX) або Action Password для відключення захисту пристрою.
            </p>

            <form onSubmit={handleUnpair} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recovery Code (збережений під час прив’язки)
                </label>
                <input
                  type="text"
                  value={unpairRecoveryCode}
                  onChange={(e) => setUnpairRecoveryCode(e.target.value)}
                  placeholder="R-XXXXX-XXXXX"
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="text-center text-xs text-slate-500 font-bold">— АБО —</div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Action Password (пароль адміністратора)
                </label>
                <input
                  type="password"
                  value={unpairActionPassword}
                  onChange={(e) => setUnpairActionPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnpairModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isUnpairing}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl"
                >
                  {isUnpairing ? 'Вимкнення…' : 'Вимкнути Guard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
