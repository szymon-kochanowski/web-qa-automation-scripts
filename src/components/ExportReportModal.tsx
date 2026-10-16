import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, FileJson } from 'lucide-react';
import { SuiteSummary } from '../types/qa';

interface ExportReportModalProps {
  summary: SuiteSummary | null;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ summary, onClose }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState<boolean>(false);

  if (!summary) return null;

  const generateMarkdown = (): string => {
    const lines = [
      `# 📊 Raport z Testów Regresyjnych API — web-qa-automation-scripts`,
      `**Autor:** Szymon Kochanowski (QA Engineer)`,
      `**Data wykonania:** ${new Date(summary.executedAt).toLocaleString()}`,
      `**Target URL:** \`${summary.targetUrl}\``,
      `**Werdykt:** **${summary.verdict === 'PASS' ? '✅ PASS (SUKCES)' : '❌ FAIL (REGRESJA DETEKCJA)'}**`,
      '',
      `## 📈 Podsumowanie Wyników`,
      `| Metryka | Wartość |`,
      `|---|---|`,
      `| Łączna liczba kroków | ${summary.totalSteps} |`,
      `| Testy zaliczone (PASS) | ${summary.passedSteps} |`,
      `| Testy niezaliczone (FAIL) | ${summary.failedSteps} |`,
      `| Całkowity czas wykonania | ${summary.totalDurationMs} ms |`,
      `| Naruszenia SLA (>300ms) | ${summary.slaBreachedCount} |`,
      '',
      `## 🔍 Przebieg Kroków Regresji`,
      `| # | Krok | Metoda & Endpoint | HTTP | Czas | Schema | Status |`,
      `|---|---|---|---|---|---|---|`,
    ];

    summary.steps.forEach((s) => {
      const schemaStatus = s.validationResult ? (s.validationResult.valid ? 'OK' : `FAIL (${s.validationResult.errors.length})`) : 'N/A';
      const stepStatus = s.passed ? '✅ PASS' : '❌ FAIL';
      lines.push(
        `| ${s.stepNumber} | ${s.name} | \`${s.method} ${s.endpoint}\` | ${s.status} | ${s.durationMs}ms | ${schemaStatus} | ${stepStatus} |`
      );
    });

    lines.push('');
    lines.push(`_Wygenerowano automatycznie przez autorskie narzędzie QA: web-qa-automation-scripts (Szymon Kochanowski)_`);
    return lines.join('\n');
  };

  const reportText = format === 'markdown' ? generateMarkdown() : JSON.stringify(summary, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `qa_regression_report_${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([reportText], {
      type: format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111322] border border-purple-900/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Eksport Raportu z Testów Regresyjnych</h3>
              <p className="text-[11px] text-slate-400">Pobierz lub skopiuj raport do zgłoszenia Jira lub PR</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                  format === 'markdown' ? 'bg-purple-600/30 text-purple-300 font-bold' : 'text-slate-400'
                }`}
              >
                <FileText className="w-3 h-3" />
                Markdown
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                  format === 'json' ? 'bg-purple-600/30 text-purple-300 font-bold' : 'text-slate-400'
                }`}
              >
                <FileJson className="w-3 h-3" />
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-4 flex-1 overflow-y-auto">
          <pre className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-purple-200 border border-slate-800/90 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
            {reportText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <span className="text-xs text-slate-400 font-mono">
            Format: {format.toUpperCase()} • Szymon Kochanowski
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Skopiowano do schowka!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Kopiuj
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Pobierz Raport
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
