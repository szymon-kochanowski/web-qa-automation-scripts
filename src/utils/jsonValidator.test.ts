import test from 'node:test';
import assert from 'node:assert/strict';
import { JsonSchemaValidator } from './jsonValidator.ts';

test('validates correct product payload against schema', () => {
  const schema = {
    type: 'object',
    required: ['id', 'sku', 'price', 'inStock'],
    properties: {
      id: { type: 'string' },
      sku: { type: 'string', minLength: 3 },
      price: { type: 'number', minimum: 0 },
      inStock: { type: 'boolean' },
    },
  };

  const payload = {
    id: 'prod_101',
    sku: 'SKU-2026',
    price: 99.95,
    inStock: true,
  };

  const res = JsonSchemaValidator.validate(payload, schema);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
  assert.ok(res.summary.passedChecks > 0);
});

test('detects missing required fields and type mismatches', () => {
  const schema = {
    type: 'object',
    required: ['id', 'sku', 'price'],
    properties: {
      id: { type: 'string' },
      sku: { type: 'string' },
      price: { type: 'number' },
    },
  };

  // Missing 'id' and 'price' is string instead of number
  const corruptPayload = {
    sku: 'SKU-BROKEN',
    price: 'not_a_number',
  };

  const res = JsonSchemaValidator.validate(corruptPayload, schema);
  assert.equal(res.valid, false);
  assert.ok(res.errors.length >= 2);

  const missingId = res.errors.find((e) => e.code === 'MISSING_REQUIRED_KEY' && e.path === 'id');
  assert.ok(missingId, 'Should flag missing required id field');

  const typeMismatch = res.errors.find((e) => e.code === 'TYPE_MISMATCH' && e.path === 'price');
  assert.ok(typeMismatch, 'Should flag price type mismatch');
});

test('detects string "NaN" and serialization anomalies', () => {
  const schema = {
    type: 'object',
    properties: {
      calculatedTotal: { type: 'string' },
    },
  };

  const anomalyPayload = {
    calculatedTotal: 'NaN',
  };

  const res = JsonSchemaValidator.validate(anomalyPayload, schema, { detectAnomalies: true });
  const anomaly = res.errors.find((e) => e.code === 'ANOMALY_STRING_SERIALIZATION');
  assert.ok(anomaly, 'Should detect literal string NaN serialization anomaly');
});

test('enforces enum and format constraints', () => {
  const schema = {
    type: 'object',
    properties: {
      currency: { type: 'string', enum: ['PLN', 'EUR', 'USD'] },
      contactEmail: { type: 'string', format: 'email' },
    },
  };

  const invalidPayload = {
    currency: 'INVALID_CURRENCY',
    contactEmail: 'not-an-email',
  };

  const res = JsonSchemaValidator.validate(invalidPayload, schema);
  assert.equal(res.valid, false);

  const enumErr = res.errors.find((e) => e.code === 'ENUM_VIOLATION');
  assert.ok(enumErr, 'Should flag enum violation');

  const emailErr = res.errors.find((e) => e.code === 'FORMAT_EMAIL');
  assert.ok(emailErr, 'Should flag invalid email format');
});
