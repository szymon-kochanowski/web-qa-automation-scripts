import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Terminal, Info, ExternalLink } from 'lucide-react';
import { SCRIPT_ITEMS } from '../data/scriptSources';

export const ScriptViewer: React.FC = () => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>('python');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  const currentScript = SCRIPT_ITEMS.find((s) => s.id === selectedScriptId) || SCRIPT_ITEMS[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentScript.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(currentScript.cliCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentScript.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentScript.filename.split('/').pop() || 'script';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Script Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SCRIPT_ITEMS.map((item) => {
          const isSelected = item.id === selectedScriptId;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedScriptId(item.id)}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                  : 'bg-[#111322] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${item.badgeColor}`}
                >
                  {item.tech}
                </span>
                <FileCode className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
              </div>
              <h4 className="text-xs font-bold text-slate-100 truncate">{item.title}</h4>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                {item.filename.split('/').pop()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Script Details & Code Card */}
      <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl">
        {/* Top Header of the Script */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md border ${currentScript.badgeColor}`}
              >
                {currentScript.tech}
              </span>
              <h3 className="text-base font-bold text-white font-mono">{currentScript.filename}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {currentScript.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Pobierz Plik
            </button>
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Skopiowano Kod!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Kopiuj Kod
                </>
              )}
            </button>
          </div>
        </div>

        {/* CLI Execution Command Helper */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Polecenie uruchomienia w terminalu CLI:
              </span>
              <code className="text-xs font-mono text-purple-300 font-semibold break-all">
                {currentScript.cliCommand}
              </code>
            </div>
          </div>
          <button
            onClick={handleCopyCmd}
            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 shrink-0 self-end sm:self-auto"
          >
            {copiedCmd ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Skopiowano
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Kopiuj CLI
              </>
            )}
          </button>
        </div>

        {/* Code Content Container */}
        <div className="mt-4 relative rounded-xl bg-[#080911] border border-slate-800/90 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
            <span>{currentScript.filename}</span>
            <span>UTF-8 • Szymon Kochanowski • MIT</span>
          </div>
          <pre className="p-4 text-xs font-mono text-purple-200/90 leading-relaxed overflow-x-auto max-h-[500px]">
            <code>{currentScript.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
