import React from 'react';
import { Terminal, Shield, Cpu, Activity, Play, RefreshCw, FileCode2, ExternalLink } from 'lucide-react';

interface HeaderProps {
  onRunSuite: () => void;
  isRunning: boolean;
  onResetFaults: () => void;
  activeFaultsCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRunSuite,
  isRunning,
  onResetFaults,
  activeFaultsCount,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-purple-900/30 bg-[#0d0f1a]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Meta */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-900/30 border border-purple-400/30">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                  web-qa-automation-scripts
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  v1.0.0
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Mock API Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Autor: <strong className="text-slate-200">Szymon Kochanowski</strong> (QA Engineer)</span>
                <span>•</span>
                <span className="text-purple-300/80">Python • JavaScript • Node.js • Postman</span>
                <span>•</span>
                <span className="text-slate-400">Licencja MIT</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {activeFaultsCount > 0 && (
              <button
                onClick={onResetFaults}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                title="Przywróć czyste środowisko bez symulacji błędów"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Usterek ({activeFaultsCount})
              </button>
            )}

            <button
              onClick={onRunSuite}
              disabled={isRunning}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 transition-all ${
                isRunning
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30 hover:shadow-purple-700/40 border border-purple-400/40 active:scale-95'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                  Wykonywanie Testów...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Uruchom Pakiet Regresji (Live)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-4 border-t border-slate-800/80 pt-2 overflow-x-auto">
          {[
            { id: 'suite', label: 'Dashboard & Live Runner', icon: Activity },
            { id: 'scripts', label: 'Katalog Skryptów CLI (4)', icon: FileCode2 },
            { id: 'playground', label: 'JSON Contract Inspector', icon: Shield },
            { id: 'api-spec', label: 'Specyfikacja Mock API', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
