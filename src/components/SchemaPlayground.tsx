import React, { useState, useMemo } from 'react';
import { Shield, CheckCircle2, XCircle, AlertTriangle, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { JsonSchemaValidator, ValidationResult } from '../utils/jsonValidator';

const PRESET_SCHEMAS: Record<string, { name: string; schema: any; validSample: any; invalidSample: any }> = {
  product: {
    name: 'Kontrakt Produktu (E-commerce)',
    schema: {
      type: 'object',
      required: ['id', 'sku', 'name', 'price', 'currency', 'inStock'],
      properties: {
        id: { type: 'string' },
        sku: { type: 'string', minLength: 3 },
        name: { type: 'string', minLength: 2 },
        price: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['PLN', 'EUR', 'USD', 'GBP'] },
        inStock: { type: 'boolean' },
        category: { type: 'string' },
      },
      additionalProperties: false,
    },
    validSample: {
      id: 'prod_901',
      sku: 'PROBE-4421',
      name: 'Automated Regression Probe',
      price: 249.99,
      currency: 'PLN',
      inStock: true,
      category: 'Diagnostic Hardware',
    },
    invalidSample: {
      sku: 'QA', // too short (< 3)
      name: 'Broken Item',
      price: 'NaN', // string "NaN" serialization anomaly!
      currency: 'BITCOIN', // invalid enum
      inStock: 'true', // string instead of boolean
      // missing required 'id'
      unexpectedField: 'unauthorized_payload',
    },
  },
  auth: {
    name: 'Kontrakt Logowania & Tokenu JWT',
    schema: {
      type: 'object',
      required: ['success', 'token', 'expiresIn', 'user'],
      properties: {
        success: { type: 'boolean' },
        token: { type: 'string', minLength: 10 },
        expiresIn: { type: 'integer', minimum: 1 },
        user: {
          type: 'object',
          required: ['id', 'email', 'role'],
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string' },
          },
        },
      },
    },
    validSample: {
      success: true,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_payload',
      expiresIn: 3600,
      user: {
        id: 'usr_qa_01',
        email: 'szymon.kochanowski@qa.local',
        role: 'Lead QA Engineer',
      },
    },
    invalidSample: {
      success: 1, // number instead of boolean
      token: 'short', // length < 10
      expiresIn: -50, // minimum violation
      user: {
        id: null, // null not allowed
        email: 'invalid-email-address', // invalid email format
      },
    },
  },
  health: {
    name: 'Kontrakt Health Check & SLA',
    schema: {
      type: 'object',
      required: ['status', 'timestamp', 'service', 'version'],
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'maintenance'] },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string' },
        version: { type: 'string' },
        uptime: { type: 'number' },
      },
    },
    validSample: {
      status: 'healthy',
      timestamp: '2026-10-16T09:30:00Z',
      service: 'web-qa-mock-service',
      version: '1.0.0',
      uptime: 3600.5,
    },
    invalidSample: {
      status: 'offline', // enum error
      timestamp: 'NOT_A_DATE',
      service: 'web-qa-mock-service',
      // missing version
      uptime: 'NaN',
    },
  },
};

export const SchemaPlayground: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('product');
  const [schemaText, setSchemaText] = useState<string>(
    JSON.stringify(PRESET_SCHEMAS.product.schema, null, 2)
  );
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(PRESET_SCHEMAS.product.validSample, null, 2)
  );

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    setSchemaText(JSON.stringify(PRESET_SCHEMAS[key].schema, null, 2));
    setPayloadText(JSON.stringify(PRESET_SCHEMAS[key].validSample, null, 2));
  };

  const handleLoadValid = () => {
    if (PRESET_SCHEMAS[selectedPreset]) {
      setPayloadText(JSON.stringify(PRESET_SCHEMAS[selectedPreset].validSample, null, 2));
    }
  };

  const handleLoadInvalid = () => {
    if (PRESET_SCHEMAS[selectedPreset]) {
      setPayloadText(JSON.stringify(PRESET_SCHEMAS[selectedPreset].invalidSample, null, 2));
    }
  };

  // Live validation
  const validationResult: { result: ValidationResult | null; parseError?: string } = useMemo(() => {
    let parsedSchema: any;
    let parsedPayload: any;

    try {
      parsedSchema = JSON.parse(schemaText);
    } catch (e: any) {
      return { result: null, parseError: `Błąd parsowania Schematu JSON: ${e.message}` };
    }

    try {
      parsedPayload = JSON.parse(payloadText);
    } catch (e: any) {
      return { result: null, parseError: `Błąd parsowania Payloadu JSON: ${e.message}` };
    }

    const res = JsonSchemaValidator.validate(parsedPayload, parsedSchema, {
      detectAnomalies: true,
      strictTypes: true,
    });

    return { result: res };
  }, [schemaText, payloadText]);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  JSON Schema Contract Inspector & Anomaly Detector
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interaktywne środowisko walidacji kontraktów JSON w oparciu o autorski moduł{' '}
                  <code className="text-purple-300 font-mono">json_schema_validator.js</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Wybierz wzorzec:</span>
            {Object.entries(PRESET_SCHEMAS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPreset === key
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Schema & Payload Editors */}
        <div className="space-y-4">
          {/* Payload Editor Card */}
          <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Payload JSON do Weryfikacji
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleLoadValid}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  Załaduj Poprawny (Pass)
                </button>
                <button
                  onClick={handleLoadInvalid}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                >
                  Załaduj z Błędami (Fail)
                </button>
              </div>
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={9}
              className="mt-3 w-full p-3 bg-slate-950 font-mono text-xs text-purple-200 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Schema Definition Card */}
          <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Definicja Kontraktu (JSON Schema)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Edytowalny JSON</span>
            </div>
            <textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              rows={8}
              className="mt-3 w-full p-3 bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Right Column: Live Validation Diagnostics */}
        <div className="space-y-4">
          <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Wynik Walidacji Kontraktu na Żywo
              </h4>

              {validationResult.parseError ? (
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Błąd Składni JSON
                </span>
              ) : validationResult.result?.valid ? (
                <span className="px-3 py-1 text-xs font-extrabold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  KONTRAKT SPEŁNIONY (PASS)
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-extrabold rounded-md bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  WYKRYTO NARUSZENIA ({validationResult.result?.errors.length})
                </span>
              )}
            </div>

            {/* Parse Error Display */}
            {validationResult.parseError && (
              <div className="mt-4 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs font-mono">
                {validationResult.parseError}
              </div>
            )}

            {/* Validation Statistics */}
            {validationResult.result && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Sprawdzenia
                  </span>
                  <span className="text-lg font-bold font-mono text-white">
                    {validationResult.result.summary.totalChecks}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Błędy Krytyczne
                  </span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      validationResult.result.summary.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {validationResult.result.summary.errorCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Ostrzeżenia/Anomalie
                  </span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      validationResult.result.summary.warningCount > 0
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {validationResult.result.summary.warningCount}
                  </span>
                </div>
              </div>
            )}

            {/* Errors / Violations List */}
            {validationResult.result && (
              <div className="mt-4 flex-1">
                {validationResult.result.errors.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-950/10 border border-emerald-900/30 rounded-xl my-auto">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <h5 className="text-sm font-bold text-emerald-300">Brak naruszeń schematu</h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Wszystkie typy danych, wymagane pola, ograniczenia numeryczne i formaty są zgodne z
                      kontraktem API.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                      Zarejestrowane wady kontraktu i anomalie wartości:
                    </h5>
                    {validationResult.result.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs font-mono ${
                          err.severity === 'ERROR'
                            ? 'bg-red-950/20 border-red-900/40 text-red-300'
                            : 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200">
                            Pole: <strong className="text-purple-300">{err.path}</strong>
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded ${
                              err.severity === 'ERROR'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {err.code}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300 leading-relaxed">{err.message}</p>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Oczekiwano:</span>
                            <span className="text-emerald-400 font-semibold">{String(err.expected)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Otrzymano:</span>
                            <span className="text-red-400 font-semibold">{String(err.actual)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
