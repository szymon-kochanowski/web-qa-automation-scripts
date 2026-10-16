import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileJson,
  Layers,
  ArrowRight,
  ShieldCheck,
  Download,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react';
import { SuiteSummary, TestStepResult } from '../types/qa';

interface SuiteRunnerProps {
  summary: SuiteSummary | null;
  isRunning: boolean;
  onRunSuite: () => void;
  onOpenExport: () => void;
  targetUrl: string;
  setTargetUrl: (url: string) => void;
  slaThreshold: number;
  setSlaThreshold: (sla: number) => void;
}

export const SuiteRunner: React.FC<SuiteRunnerProps> = ({
  summary,
  isRunning,
  onRunSuite,
  onOpenExport,
  targetUrl,
  setTargetUrl,
  slaThreshold,
  setSlaThreshold,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [activeTabPerStep, setActiveTabPerStep] = useState<Record<string, 'assertions' | 'json' | 'headers'>>({});
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setStepTab = (id: string, tab: 'assertions' | 'json' | 'headers') => {
    setActiveTabPerStep((prev) => ({ ...prev, [id]: tab }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayloadId(id);
    setTimeout(() => setCopiedPayloadId(null), 2000);
  };

  const passRate =
    summary && summary.totalSteps > 0
      ? Math.round((summary.passedSteps / summary.totalSteps) * 100)
      : 0;

  const slaRate =
    summary && summary.totalSteps > 0
      ? Math.round(((summary.totalSteps - summary.slaBreachedCount) / summary.totalSteps) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Execution Control & Target Bar */}
      <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Target URL & SLA Inputs */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Endpoint URL (Mock API)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="http://localhost:3000/api/mock"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950/80 border border-slate-700/80 rounded-lg text-purple-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SLA Limit Response Time (ms)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={slaThreshold}
                  onChange={(e) => setSlaThreshold(Number(e.target.value) || 300)}
                  min={50}
                  max={5000}
                  step={50}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">ms</span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {summary && (
              <button
                onClick={onOpenExport}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Eksport Raportu
              </button>
            )}

            <button
              onClick={onRunSuite}
              disabled={isRunning}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all ${
                isRunning
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40 border border-purple-400/40 active:scale-95'
              }`}
            >
              <Play className={`w-4 h-4 fill-white ${isRunning ? 'animate-pulse' : ''}`} />
              {isRunning ? 'Wykonywanie Pakietu...' : 'Uruchom Pakiet Regresyjny'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards & Verdict Banner */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Verdict Banner */}
          <div
            className={`col-span-2 md:col-span-1 p-3.5 rounded-xl border flex flex-col justify-between ${
              summary.verdict === 'PASS'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/30 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Werdykt
              </span>
              {summary.verdict === 'PASS' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="mt-2">
              <span
                className={`text-base font-extrabold tracking-tight font-mono ${
                  summary.verdict === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {summary.verdict === 'PASS' ? 'PASS (SUKCES)' : 'REGRESJA'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.verdict === 'PASS'
                  ? 'Wszystkie testy spełniły kryteria akceptacji'
                  : 'Wykryto niezgodności ze specyfikacją lub błędy'}
              </p>
            </div>
          </div>

          {/* Pass Rate */}
          <div className="p-3.5 rounded-xl bg-[#111322] border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Wynik Testów
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white">
                {summary.passedSteps}/{summary.totalSteps}
              </span>
              <span
                className={`text-xs font-semibold ${
                  passRate === 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                ({passRate}%)
              </span>
            </div>
          </div>

          {/* SLA Rate */}
          <div className="p-3.5 rounded-xl bg-[#111322] border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Zgodność SLA (&lt;{slaThreshold}ms)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-xl font-bold font-mono ${
                  slaRate === 100 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {slaRate}%
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {summary.slaBreachedCount > 0 ? `${summary.slaBreachedCount} breach` : '0 breach'}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="p-3.5 rounded-xl bg-[#111322] border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Czas Całkowity
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-purple-300">
                {summary.totalDurationMs}
              </span>
              <span className="text-xs text-slate-500 font-mono">ms</span>
            </div>
          </div>

          {/* Execution Time */}
          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[#111322] border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ostatnie Wykonanie
            </span>
            <div className="mt-2">
              <span className="text-xs font-mono text-slate-300">
                {new Date(summary.executedAt).toLocaleTimeString()}
              </span>
              <p className="text-[11px] text-slate-500">Live Browser Session</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Szczegółowy Przebieg Scenariuszy Regresyjnych ({summary ? summary.steps.length : 0})
          </h3>
          {summary && (
            <button
              onClick={() => {
                const allOpen = Object.values(expandedSteps).filter(Boolean).length === summary.steps.length;
                const nextState: Record<string, boolean> = {};
                summary.steps.forEach((s) => {
                  nextState[s.id] = !allOpen;
                });
                setExpandedSteps(nextState);
              }}
              className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              {Object.values(expandedSteps).filter(Boolean).length === summary.steps.length
                ? 'Zwiń wszystkie'
                : 'Rozwiń wszystkie'}
            </button>
          )}
        </div>

        {!summary && !isRunning && (
          <div className="bg-[#111322]/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
              <Play className="w-6 h-6 fill-purple-400 ml-0.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">Pakiet testów nie został jeszcze uruchomiony</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Kliknij przycisk <strong>„Uruchom Pakiet Regresyjny”</strong> powyżej, aby wykonać zautomatyzowane
              testy HTTP, zweryfikować kontrakty JSON i sprawdzić asercje w czasie rzeczywistym.
            </p>
          </div>
        )}

        {summary?.steps.map((step) => {
          const isExpanded = Boolean(expandedSteps[step.id]);
          const currentTab = activeTabPerStep[step.id] || 'assertions';
          const failedAssertions = step.assertions.filter((a) => !a.passed);
          const hasSchemaErrors = Boolean(step.validationResult && !step.validationResult.valid);

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all ${
                step.passed
                  ? 'bg-[#111322] border-slate-800 hover:border-slate-700'
                  : 'bg-red-950/15 border-red-900/40 hover:border-red-800/60'
              }`}
            >
              {/* Step Summary Bar */}
              <div
                onClick={() => toggleExpand(step.id)}
                className="p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none"
              >
                {/* Left: Status Icon & Title */}
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                      step.passed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {step.passed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        #{step.stepNumber}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-100">
                        {step.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          step.method === 'GET'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : step.method === 'POST'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {step.method}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {step.endpoint}
                    </p>
                  </div>
                </div>

                {/* Right: Badges & Metrics */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {/* HTTP Status Code */}
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-md ${
                      step.status >= 200 && step.status < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : step.status === 400
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    HTTP {step.status}
                  </span>

                  {/* Duration & SLA */}
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-medium rounded-md flex items-center gap-1 ${
                      !step.slaBreached
                        ? 'bg-slate-800/80 text-emerald-400 border border-slate-700'
                        : 'bg-red-950/50 text-red-400 border border-red-800/50'
                    }`}
                    title={
                      step.slaBreached
                        ? `Przekroczono limit SLA (${step.durationMs}ms > ${step.slaLimitMs}ms)`
                        : `Zgodne z SLA (${step.durationMs}ms <= ${step.slaLimitMs}ms)`
                    }
                  >
                    <Clock className="w-3 h-3" />
                    {step.durationMs}ms
                  </span>

                  {/* Schema Status Pill */}
                  {step.validationResult && (
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${
                        step.validationResult.valid
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : 'bg-red-500/10 text-red-300 border border-red-500/30 font-semibold'
                      }`}
                    >
                      {step.validationResult.valid
                        ? 'Schema OK'
                        : `Błąd Schematu (${step.validationResult.errors.length})`}
                    </span>
                  )}

                  {/* Toggle Arrow */}
                  <button className="p-1 rounded text-slate-400 hover:text-white">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details Drawer */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 p-4 bg-slate-950/60">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                    <button
                      onClick={() => setStepTab(step.id, 'assertions')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        currentTab === 'assertions'
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Asercje & Walidacje ({step.assertions.length})
                    </button>
                    <button
                      onClick={() => setStepTab(step.id, 'json')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                        currentTab === 'json'
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Payload JSON
                      {hasSchemaErrors && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setStepTab(step.id, 'headers')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        currentTab === 'headers'
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Nagłówki HTTP
                    </button>
                  </div>

                  {/* Tab 1: Assertions List */}
                  {currentTab === 'assertions' && (
                    <div className="space-y-2">
                      {step.assertions.map((a, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                            a.passed
                              ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                              : 'bg-red-950/30 border-red-800/40 text-red-300'
                          }`}
                        >
                          {a.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-slate-200">{a.name}</span>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              {a.message}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Schema Errors Breakdown */}
                      {step.validationResult && step.validationResult.errors.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-red-950/25 border border-red-900/50">
                          <h5 className="text-xs font-bold text-red-400 flex items-center gap-1.5 mb-2">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            Szczegółowe Naruszenia Kontraktu JSON Schema ({step.validationResult.errors.length}):
                          </h5>
                          <ul className="space-y-1.5">
                            {step.validationResult.errors.map((err, eIdx) => (
                              <li
                                key={eIdx}
                                className="text-[11px] font-mono text-red-300/90 bg-red-950/40 p-2 rounded border border-red-900/40 flex items-start justify-between gap-2"
                              >
                                <div>
                                  <span className="text-amber-300 font-bold">[{err.path}]:</span>{' '}
                                  {err.message}
                                </div>
                                <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded bg-red-500/20 text-red-400 font-bold shrink-0">
                                  {err.code}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Formatted JSON with Highlight of Anomalies */}
                  {currentTab === 'json' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono">
                          Response Payload (JSON)
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(step.id, JSON.stringify(step.responseBody, null, 2))
                          }
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                        >
                          {copiedPayloadId === step.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Skopiowano
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Kopiuj JSON
                            </>
                          )}
                        </button>
                      </div>

                      {/* Code block with defect highlights */}
                      <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-purple-300 border border-slate-800 overflow-x-auto max-h-72">
                        <pre>{JSON.stringify(step.responseBody, null, 2)}</pre>
                      </div>

                      {/* Request Payload if present */}
                      {step.requestPayload && (
                        <div>
                          <span className="text-xs text-slate-400 font-mono block mb-1">
                            Wysłany Request Payload:
                          </span>
                          <div className="bg-slate-950/80 rounded-lg p-2.5 font-mono text-xs text-slate-400 border border-slate-800">
                            <pre>{JSON.stringify(step.requestPayload, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: HTTP Headers */}
                  {currentTab === 'headers' && (
                    <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs border border-slate-800 max-h-60 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-1.5 font-semibold">Nagłówek</th>
                            <th className="pb-1.5 font-semibold">Wartość</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300">
                          {Object.entries(step.responseHeaders).map(([k, v]) => (
                            <tr key={k}>
                              <td className="py-1 text-purple-300 font-semibold">{k}</td>
                              <td className="py-1 text-slate-400 break-all">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
