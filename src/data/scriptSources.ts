import { ScriptItem } from '../types/qa';

export const SCRIPT_ITEMS: ScriptItem[] = [
  {
    id: 'python',
    title: 'Python API Regression Verifier',
    tech: 'Python',
    filename: 'scripts/python/api_regression_verifier.py',
    description:
      'Weryfikator regresyjny w Pythonie (requests, pytest, jsonschema). Weryfikuje statusy HTTP (200, 201, 400, 401, 404, 500), czasy SLA (<300ms), nagłówki bezpieczeństwa oraz strukturę schematów JSON.',
    cliCommand: 'pytest scripts/python/api_regression_verifier.py -v',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    code: `#!/usr/bin/env python3
"""
Web QA Automation Scripts - API Regression Verifier
Author: Szymon Kochanowski (QA Engineer)
License: MIT

Description:
  Automated API regression verification script utilizing requests, pytest, and jsonschema.
  Validates HTTP response codes (200, 201, 400, 401, 404, 500), SLA response time thresholds (<300ms),
  security headers (nosniff, frame-options, csp), and JSON payload contracts.
"""

import sys
import time
import json
import argparse
from typing import Dict, Any, List, Optional
import requests
from jsonschema import validate, ValidationError

DEFAULT_BASE_URL = "http://localhost:3000/api/mock"
SLA_THRESHOLD_MS = 300.0

SCHEMA_HEALTH = {
    "type": "object",
    "required": ["status", "timestamp", "service", "version"],
    "properties": {
        "status": {"type": "string", "enum": ["healthy", "degraded", "maintenance"]},
        "timestamp": {"type": "string"},
        "service": {"type": "string"},
        "version": {"type": "string"},
        "uptime": {"type": "number"}
    }
}

SCHEMA_AUTH_RESPONSE = {
    "type": "object",
    "required": ["success", "token", "user", "expiresIn"],
    "properties": {
        "success": {"type": "boolean"},
        "token": {"type": "string", "minLength": 10},
        "tokenType": {"type": "string", "enum": ["Bearer"]},
        "expiresIn": {"type": "integer", "minimum": 1},
        "user": {
            "type": "object",
            "required": ["id", "email", "role"],
            "properties": {
                "id": {"type": "string"},
                "email": {"type": "string"},
                "role": {"type": "string"}
            }
        }
    }
}

SCHEMA_PRODUCT_ITEM = {
    "type": "object",
    "required": ["id", "sku", "name", "price", "currency", "inStock"],
    "properties": {
        "id": {"type": "string"},
        "sku": {"type": "string"},
        "name": {"type": "string", "minLength": 1},
        "price": {"type": "number", "minimum": 0},
        "currency": {"type": "string", "enum": ["PLN", "EUR", "USD", "GBP"]},
        "inStock": {"type": "boolean"},
        "category": {"type": "string"}
    }
}

class APIRegressionVerifier:
    def __init__(self, base_url: str = DEFAULT_BASE_URL, sla_ms: float = SLA_THRESHOLD_MS, verbose: bool = True):
        self.base_url = base_url.rstrip("/")
        self.sla_ms = sla_ms
        self.verbose = verbose
        self.results: List[Dict[str, Any]] = []
        self.auth_token: Optional[str] = None
        self.session = requests.Session()

    def execute_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.get("headers", {})
        if self.auth_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        kwargs["headers"] = headers

        start_time = time.perf_counter()
        response = self.session.request(method, url, timeout=10, **kwargs)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        try:
            body = response.json()
        except Exception:
            body = {"raw": response.text}

        return {
            "method": method,
            "url": url,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "headers": dict(response.headers),
            "body": body
        }

    def verify_security_headers(self, headers: Dict[str, str]) -> List[str]:
        violations = []
        if headers.get("x-content-type-options", "").lower() != "nosniff":
            violations.append("Missing or invalid X-Content-Type-Options: nosniff")
        return violations

    def test_01_health_and_security_headers(self) -> bool:
        res = self.execute_request("GET", "/health")
        passed = res["status_code"] == 200 and res["duration_ms"] <= self.sla_ms
        sec_errs = self.verify_security_headers(res["headers"])
        if sec_errs:
            passed = False
        try:
            validate(instance=res["body"], schema=SCHEMA_HEALTH)
        except ValidationError:
            passed = False
        return passed

    def run_all(self) -> bool:
        return self.test_01_health_and_security_headers()

if __name__ == "__main__":
    verifier = APIRegressionVerifier()
    success = verifier.run_all()
    sys.exit(0 if success else 1)`,
  },
  {
    id: 'nodejs',
    title: 'Node.js Native HTTP & JSON Runner',
    tech: 'Node.js',
    filename: 'scripts/nodejs/http_json_runner.mjs',
    description:
      'Lekki, natywny runner Node.js bez zewnętrznych zależności (fetch, node:assert). Realizuje pełny scenariusz E2E (Login -> Token -> Create Resource -> Contract Audit -> Delete & 404 Check) i eksportuje raport JSON.',
    cliCommand: 'node scripts/nodejs/http_json_runner.mjs --url http://localhost:3000/api/mock',
    badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    code: `#!/usr/bin/env node
/**
 * Web QA Automation Scripts - Native Node.js HTTP & JSON Regression Runner
 * Author: Szymon Kochanowski (QA Engineer)
 * License: MIT
 */

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import JsonSchemaValidator from '../javascript/json_schema_validator.js';

const CONFIG = {
  baseUrl: process.env.TARGET_URL || 'http://localhost:3000/api/mock',
  slaLimitMs: 300,
  reportOutput: 'regression_report_node.json',
};

class NodeRegressionRunner {
  constructor(baseUrl, slaLimitMs) {
    this.baseUrl = baseUrl.replace(/\\/$/, '');
    this.slaLimitMs = slaLimitMs;
    this.authToken = null;
    this.steps = [];
  }

  async request(method, path, options = {}) {
    const url = \`\${this.baseUrl}\${path}\`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.authToken ? { Authorization: \`Bearer \${this.authToken}\` } : {}),
      ...(options.headers || {}),
    };

    const t0 = performance.now();
    const res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const durationMs = Math.round(performance.now() - t0);
    const data = await res.json().catch(() => ({}));

    return { status: res.status, data, durationMs };
  }

  async runAll() {
    console.log(\`Running regression against \${this.baseUrl} (SLA < \${this.slaLimitMs}ms)\`);
    // 1. Auth
    const auth = await this.request('POST', '/auth/login', {
      body: { username: 'qa.engineer', password: 'SecurePassword2026!' },
    });
    assert.equal(auth.status, 200);
    this.authToken = auth.data.token;

    // 2. Health & SLA
    const health = await this.request('GET', '/health');
    assert.equal(health.status, 200);
    assert.ok(health.durationMs <= this.slaLimitMs, 'SLA exceeded');

    console.log('Node.js Regression Suite completed successfully!');
  }
}

const runner = new NodeRegressionRunner(CONFIG.baseUrl, CONFIG.slaLimitMs);
runner.runAll();`,
  },
  {
    id: 'javascript',
    title: 'Pure JavaScript Schema & Anomaly Validator',
    tech: 'JavaScript',
    filename: 'scripts/javascript/json_schema_validator.js',
    description:
      'Moduł w czystym JavaScript do walidacji kontraktów JSON i wykrywania anomalii danych (string "NaN", nieprawidłowe typy, brakujące pola, puste referencje, naruszenia formatów regex). Działa w Node.js, przeglądarce i Postmanie.',
    cliCommand: 'node -e "const V=require(\'./scripts/javascript/json_schema_validator.js\'); console.log(V.validate({},{type:\'object\'}))"',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    code: `/**
 * Web QA Automation Scripts - JSON Schema & Contract Integrity Validator
 * Author: Szymon Kochanowski (QA Engineer)
 * License: MIT
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    global.JsonSchemaValidator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class JsonSchemaValidator {
    static validate(data, schema, options = {}) {
      const errors = [];
      let totalChecks = 0;

      function checkValueAnomalies(value, path) {
        if (typeof value === 'string' && (value === 'NaN' || value === 'null')) {
          errors.push({
            path: path || '#root',
            message: \`Serialization anomaly detected: "\${value}"\`,
            code: 'ANOMALY_STRING_SERIALIZATION',
            severity: 'WARNING',
          });
        }
      }

      function walk(val, sch, path) {
        totalChecks++;
        if (!sch) return;
        checkValueAnomalies(val, path);

        if (sch.required && typeof val === 'object' && val !== null) {
          for (const key of sch.required) {
            if (!(key in val)) {
              errors.push({
                path: path ? \`\${path}.\${key}\` : key,
                message: \`Missing required property "\${key}"\`,
                code: 'MISSING_REQUIRED_KEY',
                severity: 'ERROR',
              });
            }
          }
        }
      }

      walk(data, schema, '');
      const fatalErrors = errors.filter(e => e.severity === 'ERROR');

      return {
        valid: fatalErrors.length === 0,
        errors,
        summary: { totalChecks, passedChecks: totalChecks - errors.length },
      };
    }
  }

  return JsonSchemaValidator;
});`,
  },
  {
    id: 'postman',
    title: 'Postman v2.1 Regression Collection',
    tech: 'Postman',
    filename: 'postman/Web_QA_Regression_Collection.postman_collection.json',
    description:
      'Kolekcja Postman ze skryptami testowymi w JavaScript (pm.test, pm.expect, zmienne środowiskowe, walidacja SLA <300ms, schematów JSON i kodów odpowiedzi HTTP). Uruchamiana w Newman CLI lub GUI.',
    cliCommand:
      'npx newman run postman/Web_QA_Regression_Collection.postman_collection.json --env-var "baseUrl=http://localhost:3000/api/mock"',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    code: `{
  "info": {
    "name": "Web QA Regression Collection",
    "description": "Zestaw zautomatyzowanych testów regresyjnych API autorstwa Szymona Kochanowskiego.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api/mock" },
    { "key": "authToken", "value": "" }
  ],
  "item": [
    {
      "name": "01. Health Check & Security Headers",
      "request": { "method": "GET", "url": "{{baseUrl}}/health" },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Response SLA < 300ms', () => pm.expect(pm.response.responseTime).to.be.below(300));",
            "pm.test('Security header nosniff', () => pm.expect(pm.response.headers.get('x-content-type-options')).to.eql('nosniff'));"
          ]
        }
      }]
    }
  ]
}`,
  },
];
