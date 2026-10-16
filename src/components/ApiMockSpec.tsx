import React, { useState } from 'react';
import { Cpu, Terminal, Copy, Check, ShieldCheck, ArrowRight } from 'lucide-react';

export const ApiMockSpec: React.FC = () => {
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const handleCopyCurl = (id: string, curlText: string) => {
    navigator.clipboard.writeText(curlText);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const endpoints = [
    {
      id: 'health',
      method: 'GET',
      path: '/api/mock/health',
      description: 'Zwraca status usługi, wersję, uptime oraz wymagane nagłówki bezpieczeństwa (nosniff, frame-options).',
      sampleResponse: {
        status: 'healthy',
        timestamp: '2026-10-16T09:30:00Z',
        service: 'web-qa-mock-service',
        version: '1.0.0',
        uptime: 142.5,
      },
      curl: 'curl -i http://localhost:3000/api/mock/health',
    },
    {
      id: 'login',
      method: 'POST',
      path: '/api/mock/auth/login',
      description: 'Uwierzytelnia inżyniera QA i zwraca token Bearer JWT do kolejnych kroków regresji.',
      sampleRequest: {
        username: 'qa.engineer',
        password: 'SecurePassword2026!',
      },
      sampleResponse: {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { id: 'usr_qa_01', email: 'qa.engineer@company.local', role: 'QA Automation Engineer' },
      },
      curl: `curl -i -X POST http://localhost:3000/api/mock/auth/login -H "Content-Type: application/json" -d '{"username":"qa.engineer","password":"SecurePassword2026!"}'`,
    },
    {
      id: 'products',
      method: 'GET',
      path: '/api/mock/products',
      description: 'Pobiera katalog produktów wraz z metrykami typów danych (ceny, waluta, stan magazynowy).',
      sampleResponse: {
        items: [
          {
            id: 'prod_101',
            sku: 'QA-DEV-001',
            name: 'High-Speed Packet Sniffer',
            price: 349.0,
            currency: 'PLN',
            inStock: true,
            category: 'Network Tools',
          },
        ],
        total: 1,
      },
      curl: 'curl -i http://localhost:3000/api/mock/products',
    },
    {
      id: 'create_product',
      method: 'POST',
      path: '/api/mock/products',
      description: 'Tworzy nowy zasób w katalogu (wymaga validacji typów: name, price: number >= 0). Zwraca HTTP 201.',
      sampleRequest: {
        name: 'Automated Regression Probe',
        sku: 'PROBE-991',
        price: 249.99,
        currency: 'PLN',
        inStock: true,
        category: 'Diagnostic Hardware',
      },
      sampleResponse: {
        id: 'prod_7821',
        name: 'Automated Regression Probe',
        price: 249.99,
        currency: 'PLN',
        inStock: true,
        category: 'Diagnostic Hardware',
      },
      curl: `curl -i -X POST http://localhost:3000/api/mock/products -H "Content-Type: application/json" -d '{"name":"Automated Regression Probe","sku":"PROBE-991","price":249.99,"currency":"PLN","inStock":true}'`,
    },
    {
      id: 'delete_product',
      method: 'DELETE',
      path: '/api/mock/products/:id',
      description: 'Usuwa zasób z bazy mocka i potwierdza idempotencję (kolejny GET zwraca 404 Not Found).',
      sampleResponse: {
        success: true,
        message: "Resource 'prod_7821' successfully deleted.",
        deletedId: 'prod_7821',
      },
      curl: 'curl -i -X DELETE http://localhost:3000/api/mock/products/prod_101',
    },
    {
      id: 'fault_config',
      method: 'POST',
      path: '/api/mock/fault-config',
      description: 'Kontroler wstrzykiwania błędów chaosu (500, corruptSchema, injectLatency, rejectAuth, stripSecurityHeaders).',
      sampleRequest: {
        inject500: false,
        corruptSchema: true,
        injectLatency: false,
      },
      sampleResponse: {
        success: true,
        message: 'Fault configuration updated',
        faults: { inject500: false, corruptSchema: true, injectLatency: false },
      },
      curl: `curl -i -X POST http://localhost:3000/api/mock/fault-config -H "Content-Type: application/json" -d '{"corruptSchema":true}'`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Specyfikacja Wbudowanego Mock API</h3>
            <p className="text-xs text-slate-400">
              Lokalny serwer Express udostępniający endpointy REST, nagłówki bezpieczeństwa oraz mechanizm kontrolowanego chaosu (Fault Injection).
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className="bg-[#111322] border border-purple-900/30 rounded-2xl p-5 shadow-xl space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                    ep.method === 'GET'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : ep.method === 'POST'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="text-sm font-bold font-mono text-white">{ep.path}</span>
              </div>

              <button
                onClick={() => handleCopyCurl(ep.id, ep.curl)}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                {copiedCurl === ep.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Skopiowano cURL!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Kopiuj cURL
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{ep.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {ep.sampleRequest && (
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
                    Przykładowy Request Body:
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto">
                    {JSON.stringify(ep.sampleRequest, null, 2)}
                  </pre>
                </div>
              )}

              <div className={ep.sampleRequest ? '' : 'md:col-span-2'}>
                <span className="text-[11px] font-mono text-slate-400 block mb-1">
                  Przykładowy Response Body (JSON):
                </span>
                <pre className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-purple-300 border border-slate-800 overflow-x-auto">
                  {JSON.stringify(ep.sampleResponse, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
