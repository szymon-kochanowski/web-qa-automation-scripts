#!/usr/bin/env node
/**
 * Web QA Automation Scripts - Native Node.js HTTP & JSON Regression Runner
 * Author: Szymon Kochanowski (QA Engineer)
 * License: MIT
 *
 * A lightweight, zero-dependency Node.js test runner using native `fetch` and `node:assert`.
 * Executes a full regression lifecycle:
 *   1. Auth & Bearer Token acquisition
 *   2. Health & SLA threshold verification (<300ms)
 *   3. Resource Creation (HTTP 201)
 *   4. JSON Contract Integrity & Deep Schema Validation
 *   5. Resource Deletion & 404 Idempotency Check
 *   6. Exports regression_report_node.json
 */

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import JsonSchemaValidator from '../javascript/json_schema_validator.js';

// Configuration defaults
const CONFIG = {
  baseUrl: process.env.TARGET_URL || 'http://localhost:3000/api/mock',
  slaLimitMs: 300,
  reportOutput: 'regression_report_node.json',
};

// Parse command line arguments
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--url' && process.argv[i + 1]) CONFIG.baseUrl = process.argv[++i];
  if (arg === '--sla' && process.argv[i + 1]) CONFIG.slaLimitMs = Number(process.argv[++i]);
  if (arg === '--report' && process.argv[i + 1]) CONFIG.reportOutput = process.argv[++i];
}

// Schemas
const HEALTH_SCHEMA = {
  type: 'object',
  required: ['status', 'timestamp', 'service', 'version'],
  properties: {
    status: { type: 'string', enum: ['healthy', 'degraded', 'maintenance'] },
    timestamp: { type: 'string', format: 'date-time' },
    service: { type: 'string', minLength: 2 },
    version: { type: 'string' },
    uptime: { type: 'number' },
  },
};

const AUTH_SCHEMA = {
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
        email: { type: 'string' },
        role: { type: 'string' },
      },
    },
  },
};

const PRODUCT_SCHEMA = {
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
};

// ANSI Color Helpers
const C = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`,
};

class NodeRegressionRunner {
  constructor(baseUrl, slaLimitMs) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.slaLimitMs = slaLimitMs;
    this.authToken = null;
    this.createdProductId = null;
    this.steps = [];
    this.startTime = Date.now();
  }

  async request(method, path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...(options.headers || {}),
    };

    const t0 = performance.now();
    let res;
    let data;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      return {
        url,
        method,
        status: 0,
        headers: {},
        data: { error: err.message },
        durationMs,
        networkError: true,
      };
    }

    const durationMs = Math.round(performance.now() - t0);
    const headersObj = {};
    res.headers.forEach((v, k) => {
      headersObj[k.toLowerCase()] = v;
    });

    return {
      url,
      method,
      status: res.status,
      headers: headersObj,
      data,
      durationMs,
      networkError: false,
    };
  }

  recordStep(title, passed, status, durationMs, details = [], schemaValidation = null) {
    const icon = passed ? C.green('[PASS]') : C.red('[FAIL]');
    const timing = durationMs <= this.slaLimitMs ? C.green(`${durationMs}ms`) : C.red(`${durationMs}ms (SLA breach!)`);
    console.log(`${icon} ${C.bold(title)} - HTTP ${status} in ${timing}`);

    for (const d of details) {
      console.log(`       ${passed ? C.dim(d) : C.red(`✖ ${d}`)}`);
    }

    this.steps.push({
      step: title,
      passed,
      status,
      durationMs,
      slaLimitMs: this.slaLimitMs,
      slaBreached: durationMs > this.slaLimitMs,
      details,
      schemaValidation,
    });
  }

  async runStep1_Auth() {
    console.log(C.cyan('\n[1/5] Step 1: Authentication & Token Retrieval'));
    const res = await this.request('POST', '/auth/login', {
      body: { username: 'qa.engineer', password: 'SecurePassword2026!' },
    });

    const details = [];
    let passed = true;

    try {
      assert.equal(res.status, 200, `Expected HTTP 200, received ${res.status}`);
      details.push('HTTP 200 OK verified');
    } catch (e) {
      passed = false;
      details.push(e.message);
    }

    const validation = JsonSchemaValidator.validate(res.data, AUTH_SCHEMA);
    if (!validation.valid) {
      passed = false;
      validation.errors.forEach((e) => details.push(`Schema Error: ${e.message} at ${e.path}`));
    } else {
      details.push('Auth response schema matches contract');
      this.authToken = res.data.token;
    }

    this.recordStep('Auth: Login & Token Acquisition', passed, res.status, res.durationMs, details, validation);
    return passed;
  }

  async runStep2_Health() {
    console.log(C.cyan('\n[2/5] Step 2: Health Check & Security Headers Audit'));
    const res = await this.request('GET', '/health');

    const details = [];
    let passed = true;

    if (res.status !== 200) {
      passed = false;
      details.push(`Expected HTTP 200, received ${res.status}`);
    } else {
      details.push('HTTP 200 OK verified');
    }

    // SLA Check
    if (res.durationMs > this.slaLimitMs) {
      passed = false;
      details.push(`Response time ${res.durationMs}ms exceeds SLA limit of ${this.slaLimitMs}ms`);
    } else {
      details.push(`SLA compliant: ${res.durationMs}ms < ${this.slaLimitMs}ms`);
    }

    // Security Headers Check
    const nosniff = res.headers['x-content-type-options'];
    if (nosniff !== 'nosniff') {
      passed = false;
      details.push(`Missing or invalid X-Content-Type-Options: expected "nosniff", got "${nosniff}"`);
    } else {
      details.push('Header X-Content-Type-Options: nosniff present');
    }

    // Schema Check
    const validation = JsonSchemaValidator.validate(res.data, HEALTH_SCHEMA);
    if (!validation.valid) {
      passed = false;
      validation.errors.forEach((e) => details.push(`Schema Error: ${e.message} at ${e.path}`));
    } else {
      details.push('Health payload schema valid');
    }

    this.recordStep('Health Check & Security Headers', passed, res.status, res.durationMs, details, validation);
    return passed;
  }

  async runStep3_CreateResource() {
    console.log(C.cyan('\n[3/5] Step 3: Create Resource (POST /products)'));
    const payload = {
      name: 'Automated Regression Probe',
      sku: `PROBE-${Date.now().toString().slice(-6)}`,
      price: 289.5,
      currency: 'PLN',
      inStock: true,
      category: 'Diagnostic Hardware',
    };

    const res = await this.request('POST', '/products', { body: payload });
    const details = [];
    let passed = true;

    if (res.status !== 201) {
      passed = false;
      details.push(`Expected HTTP 201 Created, received ${res.status}`);
    } else {
      details.push('HTTP 201 Created verified');
    }

    const validation = JsonSchemaValidator.validate(res.data, PRODUCT_SCHEMA);
    if (!validation.valid) {
      passed = false;
      validation.errors.forEach((e) => details.push(`Contract Error: ${e.message} at ${e.path}`));
    } else {
      this.createdProductId = res.data.id;
      details.push(`Created product ID: ${this.createdProductId}`);
      details.push('Product schema contract verified');
    }

    this.recordStep('Create Resource (POST /products)', passed, res.status, res.durationMs, details, validation);
    return passed;
  }

  async runStep4_VerifyContractDeep() {
    console.log(C.cyan('\n[4/5] Step 4: Validate Created Resource Contract (GET /products/:id)'));
    const targetId = this.createdProductId || 'prod_001';
    const res = await this.request('GET', `/products/${targetId}`);

    const details = [];
    let passed = true;

    if (res.status !== 200) {
      passed = false;
      details.push(`Expected HTTP 200, received ${res.status}`);
    } else {
      details.push(`Fetched entity ID ${targetId}`);
    }

    const validation = JsonSchemaValidator.validate(res.data, PRODUCT_SCHEMA, { detectAnomalies: true });
    if (!validation.valid) {
      passed = false;
      validation.errors.forEach((e) => details.push(`Field violation: ${e.message} [Code: ${e.code}]`));
    } else {
      details.push('Deep contract validation passed: zero type or value anomalies');
    }

    this.recordStep('JSON Contract Validation', passed, res.status, res.durationMs, details, validation);
    return passed;
  }

  async runStep5_DeleteAndIdempotency() {
    console.log(C.cyan('\n[5/5] Step 5: Teardown Resource & 404 Idempotency Check'));
    const targetId = this.createdProductId || 'prod_001';
    const delRes = await this.request('DELETE', `/products/${targetId}`);

    const details = [];
    let passed = true;

    if (delRes.status !== 200 && delRes.status !== 204) {
      passed = false;
      details.push(`Expected HTTP 200/204 on delete, received ${delRes.status}`);
    } else {
      details.push(`Product ${targetId} deletion returned HTTP ${delRes.status}`);
    }

    // Verify subsequent GET returns 404
    const getRes = await this.request('GET', `/products/${targetId}`);
    if (getRes.status !== 404) {
      passed = false;
      details.push(`Expected HTTP 404 on deleted resource, received ${getRes.status}`);
    } else {
      details.push('Subsequent GET returned HTTP 404 Not Found (Idempotent cleanup confirmed)');
    }

    this.recordStep('Teardown & Idempotency (404)', passed, delRes.status, delRes.durationMs, details);
    return passed;
  }

  async runAll() {
    console.log(C.bold('========================================================================'));
    console.log(C.bold('  WEB QA AUTOMATION SCRIPTS - NODE.JS REGRESSION SUITE RUNNER'));
    console.log(`  Author     : ${C.cyan('Szymon Kochanowski (QA Engineer)')}`);
    console.log(`  Target URL : ${this.baseUrl}`);
    console.log(`  SLA Limit  : ${this.slaLimitMs}ms`);
    console.log(C.bold('========================================================================'));

    await this.runStep1_Auth();
    await this.runStep2_Health();
    await this.runStep3_CreateResource();
    await this.runStep4_VerifyContractDeep();
    await this.runStep5_DeleteAndIdempotency();

    const total = this.steps.length;
    const passedCount = this.steps.filter((s) => s.passed).length;
    const failedCount = total - passedCount;
    const allPassed = failedCount === 0;

    console.log(C.bold('\n========================================================================'));
    console.log(
      `  EXECUTION SUMMARY: ${passedCount}/${total} PASSED | ${
        allPassed ? C.green('ALL CHECKS PASSED') : C.red(`${failedCount} FAILED`)
      }`
    );
    console.log(C.bold('========================================================================'));

    const report = {
      suite: 'web-qa-automation-scripts',
      runner: 'Node.js Native HTTP & JSON Runner',
      author: 'Szymon Kochanowski',
      targetUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      durationTotalMs: Date.now() - this.startTime,
      summary: {
        totalSteps: total,
        passedSteps: passedCount,
        failedSteps: failedCount,
        verdict: allPassed ? 'PASS' : 'FAIL',
      },
      steps: this.steps,
    };

    try {
      await writeFile(CONFIG.reportOutput, JSON.stringify(report, null, 2), 'utf-8');
      console.log(C.green(`\nReport successfully written to ${CONFIG.reportOutput}`));
    } catch (err) {
      console.error(C.yellow(`Failed to write report file: ${err.message}`));
    }

    return allPassed;
  }
}

// Execute if run directly
const runner = new NodeRegressionRunner(CONFIG.baseUrl, CONFIG.slaLimitMs);
runner.runAll().then((success) => {
  if (!success && process.env.STRICT_EXIT === 'true') {
    process.exit(1);
  }
});
