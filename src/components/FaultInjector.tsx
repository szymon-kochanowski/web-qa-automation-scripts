import React from 'react';
import { AlertTriangle, Clock, FileWarning, KeyRound, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';
import { FaultConfig } from '../types/qa';

interface FaultInjectorProps {
  faults: FaultConfig;
  onToggleFault: (key: keyof FaultConfig, val: boolean) => void;
  onReset: () => void;
  onSetPreset: (preset: 'clean' | 'chaos' | 'contract' | 'latency') => void;
  loading: boolean;
}

export const FaultInjector: React.FC<FaultInjectorProps> = ({
  faults,
  onToggleFault,
  onReset,
  onSetPreset,
  loading,
}) => {
  const activeCount = Object.values(faults).filter(Boolean).length;

  return (
    <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Panel Symulacji Usterek API (Chaos Engineering)
              </h2>
              {activeCount > 0 ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {activeCount} {activeCount === 1 ? 'usterka aktywna' : 'usterki aktywne'}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Środowisko Czyste (Happy Path)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Wstrzykuj celowe defekty do lokalnego Mock API, aby zweryfikować asercje i mechanizmy detekcji błędów w skryptach testowych.
            </p>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onSetPreset('clean')}
            disabled={loading}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Wyłącz wszystkie usterki"
          >
            Czysty (OK)
          </button>
          <button
            onClick={() => onSetPreset('contract')}
            disabled={loading}
            className="px-2.5 py-1 text-xs rounded-md bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-700/50 transition-colors"
            title="Symuluj tylko błędy kontraktu JSON"
          >
            Błędy Kontraktu
          </button>
          <button
            onClick={() => onSetPreset('latency')}
            disabled={loading}
            className="px-2.5 py-1 text-xs rounded-md bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-700/50 transition-colors"
            title="Symuluj przekroczenie SLA"
          >
            Spike SLA (&gt;800ms)
          </button>
          <button
            onClick={() => onSetPreset('chaos')}
            disabled={loading}
            className="px-2.5 py-1 text-xs rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-300 border border-red-700/50 transition-colors font-medium"
            title="Włącz wszystkie defekty"
          >
            Full Chaos
          </button>
        </div>
      </div>

      {/* Fault Switches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
        {/* 1. HTTP 500 Fault */}
        <div
          onClick={() => onToggleFault('inject500', !faults.inject500)}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none ${
            faults.inject500
              ? 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  faults.inject500 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Wymuś HTTP 500 Server Error</h3>
                <span className="text-[11px] font-mono text-red-400/90 font-medium">InternalServerError</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={faults.inject500}
              onChange={() => {}}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-red-600 focus:ring-red-500 focus:ring-offset-0 bg-slate-950 pointer-events-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Powoduje natychmiastowe zwrócenie kodu <code className="text-slate-300">500</code> z JSON błędu serwera dla wszystkich żądań.
          </p>
        </div>

        {/* 2. Corrupt JSON Contract */}
        <div
          onClick={() => onToggleFault('corruptSchema', !faults.corruptSchema)}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none ${
            faults.corruptSchema
              ? 'bg-purple-950/40 border-purple-500/50 shadow-md shadow-purple-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  faults.corruptSchema ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <FileWarning className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Zepsucie Kontraktu JSON</h3>
                <span className="text-[11px] font-mono text-purple-400/90 font-medium">Schema Violation & NaN</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={faults.corruptSchema}
              onChange={() => {}}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 bg-slate-950 pointer-events-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Wstrzykuje pole <code className="text-purple-300">price: "NaN"</code>, usuwa wymagane <code className="text-purple-300">id</code> oraz psuje typy danych w odpowiedziach.
          </p>
        </div>

        {/* 3. Latency SLA Breach */}
        <div
          onClick={() => onToggleFault('injectLatency', !faults.injectLatency)}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none ${
            faults.injectLatency
              ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  faults.injectLatency ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Opóźnienie Odpowiedzi (&gt;800ms)</h3>
                <span className="text-[11px] font-mono text-amber-400/90 font-medium">SLA Breach (&gt;300ms)</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={faults.injectLatency}
              onChange={() => {}}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-amber-600 focus:ring-amber-500 focus:ring-offset-0 bg-slate-950 pointer-events-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Dodaje sztuczne opóźnienie 850ms do każdego żądania, celowo łamiąc wymóg SLA odpowiedzi &lt; 300ms.
          </p>
        </div>

        {/* 4. Reject Auth / 401 Unauthorized */}
        <div
          onClick={() => onToggleFault('rejectAuth', !faults.rejectAuth)}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none ${
            faults.rejectAuth
              ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  faults.rejectAuth ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Odrzucenie Autoryzacji (401)</h3>
                <span className="text-[11px] font-mono text-rose-400/90 font-medium">HTTP 401 Unauthorized</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={faults.rejectAuth}
              onChange={() => {}}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-0 bg-slate-950 pointer-events-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Odrzuca poprawne dane uwierzytelniające na <code className="text-slate-300">/auth/login</code> i blokuje tokeny dostępowe.
          </p>
        </div>

        {/* 5. Strip Security Headers */}
        <div
          onClick={() => onToggleFault('stripSecurityHeaders', !faults.stripSecurityHeaders)}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none ${
            faults.stripSecurityHeaders
              ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  faults.stripSecurityHeaders ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Usuń Nagłówki Bezpieczeństwa</h3>
                <span className="text-[11px] font-mono text-indigo-400/90 font-medium">Missing Security Headers</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={faults.stripSecurityHeaders}
              onChange={() => {}}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-slate-950 pointer-events-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Usuwa nagłówek <code className="text-indigo-300">X-Content-Type-Options: nosniff</code> i <code className="text-indigo-300">CSP</code>, testując audyt nagłówków.
          </p>
        </div>

        {/* Reset Action Card */}
        <div
          onClick={onReset}
          className="cursor-pointer p-3.5 rounded-xl border border-dashed border-slate-700/80 hover:border-purple-500/60 bg-slate-900/30 hover:bg-purple-950/10 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Zresetuj Stan Mock API</h3>
              <span className="text-[11px] text-slate-400">Przywróć stan początkowy</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Wyłącza wszystkie usterki chaosu i przywraca oryginalną bazę danych produktów w mocku.
          </p>
        </div>
      </div>
    </div>
  );
};
