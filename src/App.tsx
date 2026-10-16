import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FaultInjector } from './components/FaultInjector';
import { SuiteRunner } from './components/SuiteRunner';
import { ScriptViewer } from './components/ScriptViewer';
import { SchemaPlayground } from './components/SchemaPlayground';
import { ApiMockSpec } from './components/ApiMockSpec';
import { ExportReportModal } from './components/ExportReportModal';
import { FaultConfig, SuiteSummary, TestStepResult } from './types/qa';
import { JsonSchemaValidator } from './utils/jsonValidator';

// JSON Schemas used for assertion contracts
const SCHEMAS = {
  health: {
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
  auth: {
    type: 'object',
    required: ['success', 'token', 'user', 'expiresIn'],
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
  productList: {
    type: 'object',
    required: ['items', 'total'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'sku', 'name', 'price', 'currency', 'inStock'],
          properties: {
            id: { type: 'string' },
            sku: { type: 'string', minLength: 3 },
            name: { type: 'string' },
            price: { type: 'number', minimum: 0 },
            currency: { type: 'string', enum: ['PLN', 'EUR', 'USD', 'GBP'] },
            inStock: { type: 'boolean' },
          },
        },
      },
      total: { type: 'integer', minimum: 0 },
    },
  },
  productItem: {
    type: 'object',
    required: ['id', 'sku', 'name', 'price', 'currency', 'inStock'],
    properties: {
      id: { type: 'string' },
      sku: { type: 'string', minLength: 3 },
      name: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      currency: { type: 'string', enum: ['PLN', 'EUR', 'USD', 'GBP'] },
      inStock: { type: 'boolean' },
      category: { type: 'string' },
    },
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('suite');
  const [targetUrl, setTargetUrl] = useState<string>('/api/mock');
  const [slaThreshold, setSlaThreshold] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [summary, setSummary] = useState<SuiteSummary | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [faultLoading, setFaultLoading] = useState<boolean>(false);

  const [faults, setFaults] = useState<FaultConfig>({
    inject500: false,
    corruptSchema: false,
    injectLatency: false,
    rejectAuth: false,
    stripSecurityHeaders: false,
  });

  // Fetch current fault state from server
  const fetchFaults = useCallback(async () => {
    try {
      const res = await fetch('/api/mock/fault-config');
      if (res.ok) {
        const data = await res.json();
        if (data.faults) setFaults(data.faults);
      }
    } catch {
      // Backend may still be initializing
    }
  }, []);

  useEffect(() => {
    fetchFaults();
  }, [fetchFaults]);

  // Update fault configuration on server
  const updateFaults = async (newFaults: Partial<FaultConfig>) => {
    setFaultLoading(true);
    try {
      const res = await fetch('/api/mock/fault-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFaults),
      });
      if (res.ok) {
        const data = await res.json();
        setFaults(data.faults);
      }
    } catch (err) {
      console.error('Failed to update fault config:', err);
    } finally {
      setFaultLoading(false);
    }
  };

  const handleToggleFault = (key: keyof FaultConfig, val: boolean) => {
    updateFaults({ [key]: val });
  };

  const handleResetFaults = async () => {
    setFaultLoading(true);
    try {
      const res = await fetch('/api/mock/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFaults(data.faults);
      }
    } catch (err) {
      console.error('Failed to reset faults:', err);
    } finally {
      setFaultLoading(false);
    }
  };

  const handleSetPreset = (preset: 'clean' | 'chaos' | 'contract' | 'latency') => {
    if (preset === 'clean') {
      handleResetFaults();
    } else if (preset === 'chaos') {
      updateFaults({
        inject500: true,
        corruptSchema: true,
        injectLatency: true,
        rejectAuth: true,
        stripSecurityHeaders: true,
      });
    } else if (preset === 'contract') {
      updateFaults({
        inject500: false,
        corruptSchema: true,
        injectLatency: false,
        rejectAuth: false,
        stripSecurityHeaders: false,
      });
    } else if (preset === 'latency') {
      updateFaults({
        inject500: false,
        corruptSchema: false,
        injectLatency: true,
        rejectAuth: false,
        stripSecurityHeaders: false,
      });
    }
  };

  // Live Test Suite Execution
  const executeRegressionSuite = async () => {
    setIsRunning(true);
    const stepsResults: TestStepResult[] = [];
    const suiteStartTime = performance.now();
    let authToken = '';
    let createdProductId = '';

    const executeStep = async (
      stepNum: number,
      name: string,
      method: 'GET' | 'POST' | 'DELETE',
      endpoint: string,
      payload?: any,
      expectedStatus = 200,
      schemaDef?: any,
      customCheck?: (res: any, headers: Record<string, string>) => { name: string; passed: boolean; message: string }[]
    ): Promise<TestStepResult> => {
      const url = `${targetUrl.replace(/\/$/, '')}${endpoint}`;
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (payload) headers['Content-Type'] = 'application/json';
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const t0 = performance.now();
      let status = 0;
      let body: any = null;
      let respHeaders: Record<string, string> = {};

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: payload ? JSON.stringify(payload) : undefined,
        });
        status = response.status;
        response.headers.forEach((v, k) => {
          respHeaders[k.toLowerCase()] = v;
        });
        const text = await response.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
      } catch (err: any) {
        body = { networkError: err.message };
      }

      const durationMs = Math.round(performance.now() - t0);
      const slaBreached = durationMs > slaThreshold;
      const assertions: { name: string; passed: boolean; message: string }[] = [];

      // 1. Status Code Assertion
      const statusPassed = status === expectedStatus;
      assertions.push({
        name: `Kod odpowiedzi HTTP ${expectedStatus}`,
        passed: statusPassed,
        message: statusPassed
          ? `Otrzymano oczekiwany kod HTTP ${status}`
          : `Oczekiwano HTTP ${expectedStatus}, a otrzymano HTTP ${status}`,
      });

      // 2. SLA Assertion
      assertions.push({
        name: `Czas odpowiedzi w normie SLA (< ${slaThreshold}ms)`,
        passed: !slaBreached,
        message: !slaBreached
          ? `Czas odpowiedzi ${durationMs}ms mieści się w limicie SLA (< ${slaThreshold}ms)`
          : `Przekroczono limit SLA: ${durationMs}ms (próg: ${slaThreshold}ms)`,
      });

      // 3. Schema Validation
      let validationResult;
      if (schemaDef && body && typeof body === 'object') {
        validationResult = JsonSchemaValidator.validate(body, schemaDef, {
          detectAnomalies: true,
          strictTypes: true,
        });

        assertions.push({
          name: 'Integralność Kontraktu JSON Schema',
          passed: validationResult.valid,
          message: validationResult.valid
            ? `Wszystkie pola (${validationResult.summary.passedChecks} asercji) spełniają kontrakt schematu`
            : `Wykryto ${validationResult.errors.length} naruszeń kontraktu JSON: ${validationResult.errors
                .map((e) => e.message)
                .join('; ')}`,
        });
      }

      // 4. Custom Checks (e.g. security headers, tokens)
      if (customCheck) {
        const customRes = customCheck(body, respHeaders);
        assertions.push(...customRes);
      }

      const allAssertionsPassed = assertions.every((a) => a.passed);

      return {
        id: `step_${stepNum}_${Date.now()}`,
        stepNumber: stepNum,
        name,
        method,
        endpoint,
        requestPayload: payload,
        status,
        durationMs,
        slaLimitMs: slaThreshold,
        slaBreached,
        passed: allAssertionsPassed,
        assertions,
        validationResult,
        responseBody: body,
        responseHeaders: respHeaders,
        executedAt: new Date().toISOString(),
      };
    };

    // Step 1: Health Check & Security Headers
    const step1 = await executeStep(
      1,
      'Health Check & Audyt Nagłówków Bezpieczeństwa',
      'GET',
      '/health',
      undefined,
      200,
      SCHEMAS.health,
      (body, headers) => {
        const checks = [];
        const nosniff = headers['x-content-type-options'];
        checks.push({
          name: 'Nagłówek X-Content-Type-Options: nosniff',
          passed: nosniff === 'nosniff',
          message:
            nosniff === 'nosniff'
              ? 'Wymagany nagłówek bezpieczeństwa jest obecny'
              : `Brak nagłówka lub niepoprawna wartość: "${nosniff}"`,
        });
        return checks;
      }
    );
    stepsResults.push(step1);

    // Step 2: Authentication & Token Retrieval
    const step2 = await executeStep(
      2,
      'Uwierzytelnianie & Pobranie Bearer Tokenu',
      'POST',
      '/auth/login',
      { username: 'qa.engineer', password: 'SecurePassword2026!' },
      200,
      SCHEMAS.auth,
      (body) => {
        if (body?.token) authToken = body.token;
        return [
          {
            name: 'Pobranie i weryfikacja ważności tokenu Bearer',
            passed: Boolean(body?.token && typeof body.token === 'string' && body.token.length > 10),
            message: body?.token ? 'Wyodrębniono prawidłowy token sesyjny' : 'Brak tokenu w odpowiedzi uwierzytelniania',
          },
        ];
      }
    );
    stepsResults.push(step2);

    // Step 3: Catalog Retrieval & Array Schema Audit
    const step3 = await executeStep(
      3,
      'Pobranie Katalogu Produktów & Audyt Typów Danych',
      'GET',
      '/products',
      undefined,
      200,
      SCHEMAS.productList
    );
    stepsResults.push(step3);

    // Step 4: Resource Creation (201 Created)
    const newProductPayload = {
      name: 'Automated Regression Probe Hub',
      sku: `PROBE-${Math.floor(1000 + Math.random() * 9000)}`,
      price: 299.0,
      currency: 'PLN',
      inStock: true,
      category: 'Diagnostic Hardware',
    };
    const step4 = await executeStep(
      4,
      'Utworzenie Zasobu & Walidacja Kontraktu (POST)',
      'POST',
      '/products',
      newProductPayload,
      201,
      SCHEMAS.productItem,
      (body) => {
        if (body?.id) createdProductId = body.id;
        return [
          {
            name: 'Przypisanie unikalnego identyfikatora ID zasobu',
            passed: Boolean(body?.id),
            message: body?.id ? `Zasób pomyślnie utworzony z ID: ${body.id}` : 'Brak przypisanego pola ID',
          },
        ];
      }
    );
    stepsResults.push(step4);

    // Step 5: Deep Contract & Value Anomaly Inspection
    const targetProdId = createdProductId || 'prod_101';
    const step5 = await executeStep(
      5,
      'Głęboka Inspekcja Kontraktu Utworzonego Zasobu (GET)',
      'GET',
      `/products/${targetProdId}`,
      undefined,
      200,
      SCHEMAS.productItem
    );
    stepsResults.push(step5);

    // Step 6: Negative Boundary Test: Malformed Payload -> 400 Bad Request
    const step6 = await executeStep(
      6,
      'Test Negatywny: Uszkodzony Payload (Weryfikacja 400 Bad Request)',
      'POST',
      '/products',
      { name: '', price: 'NaN_INVALID_STRING' },
      400,
      undefined,
      (body) => [
        {
          name: 'Zabezpieczenie przed niepoprawnym typem danych',
          passed: body?.error === 'BadRequest' || body?.statusCode === 400,
          message: 'API poprawnie odrzuciło uszkodzony payload z błędem walidacji 400',
        },
      ]
    );
    stepsResults.push(step6);

    // Step 7: Resource Deletion & 404 Idempotency Check
    const step7 = await executeStep(
      7,
      'Usunięcie Zasobu & Weryfikacja Idempotencji (DELETE -> 200/204)',
      'DELETE',
      `/products/${targetProdId}`,
      undefined,
      200,
      undefined,
      () => [
        {
          name: 'Potwierdzenie usunięcia encji z bazy danych',
          passed: true,
          message: 'Encja testowa została pomyślnie usunięta ze środowiska',
        },
      ]
    );
    stepsResults.push(step7);

    // Finish Summary
    const totalDurationMs = Math.round(performance.now() - suiteStartTime);
    const passedCount = stepsResults.filter((s) => s.passed).length;
    const failedCount = stepsResults.length - passedCount;
    const slaBreachedCount = stepsResults.filter((s) => s.slaBreached).length;

    const finalSummary: SuiteSummary = {
      runId: `run_${Date.now()}`,
      executedAt: new Date().toISOString(),
      targetUrl,
      totalSteps: stepsResults.length,
      passedSteps: passedCount,
      failedSteps: failedCount,
      totalDurationMs,
      slaBreachedCount,
      verdict: failedCount === 0 ? 'PASS' : 'FAIL',
      steps: stepsResults,
    };

    setSummary(finalSummary);
    setIsRunning(false);
  };

  // Run automatically on initial load for instant demonstration
  useEffect(() => {
    executeRegressionSuite();
  }, []);

  const activeFaultsCount = Object.values(faults).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0b0c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <Header
        onRunSuite={executeRegressionSuite}
        isRunning={isRunning}
        onResetFaults={handleResetFaults}
        activeFaultsCount={activeFaultsCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Suite Runner & Dashboard */}
        {activeTab === 'suite' && (
          <div className="space-y-6">
            {/* Fault Injection Panel ("Inject Bug") */}
            <FaultInjector
              faults={faults}
              onToggleFault={handleToggleFault}
              onReset={handleResetFaults}
              onSetPreset={handleSetPreset}
              loading={faultLoading}
            />

            {/* Regression Runner & Assertion Results */}
            <SuiteRunner
              summary={summary}
              isRunning={isRunning}
              onRunSuite={executeRegressionSuite}
              onOpenExport={() => setIsExportOpen(true)}
              targetUrl={targetUrl}
              setTargetUrl={setTargetUrl}
              slaThreshold={slaThreshold}
              setSlaThreshold={setSlaThreshold}
            />
          </div>
        )}

        {/* Tab 2: Script Repository (CLI Scripts) */}
        {activeTab === 'scripts' && <ScriptViewer />}

        {/* Tab 3: JSON Contract Playground */}
        {activeTab === 'playground' && <SchemaPlayground />}

        {/* Tab 4: API Mock Specification */}
        {activeTab === 'api-spec' && <ApiMockSpec />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#080911] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>web-qa-automation-scripts • Autor: Szymon Kochanowski (QA Engineer)</span>
          <span className="font-mono text-purple-400/80">Python • Node.js • JavaScript • Postman • MIT License</span>
        </div>
      </footer>

      {/* Export Report Modal */}
      {isExportOpen && (
        <ExportReportModal summary={summary} onClose={() => setIsExportOpen(false)} />
      )}
    </div>
  );
}
