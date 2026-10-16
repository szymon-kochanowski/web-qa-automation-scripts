/**
 * Web QA Automation Scripts - JSON Schema & Contract Integrity Validator
 * Author: Szymon Kochanowski (QA Engineer)
 * License: MIT
 *
 * A lightweight, zero-dependency pure JavaScript module designed for robust JSON payload validation.
 * Compatible with Node.js, modern browsers, and Postman pre-request / test scripts.
 * Detects missing keys, invalid types, unexpected nulls, and value anomalies (NaN, format violations).
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.JsonSchemaValidator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Common anomaly detection patterns
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function getType(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'number') {
      if (Number.isNaN(val) || !Number.isFinite(val)) return 'anomaly-nan';
      if (Number.isInteger(val)) return 'integer';
      return 'number';
    }
    return typeof val;
  }

  class JsonSchemaValidator {
    /**
     * Validate an arbitrary JSON instance against a contract schema
     * @param {*} data - The data payload to validate
     * @param {Object} schema - JSON Schema definition
     * @param {Object} [options] - Configuration options
     * @returns {{ valid: boolean, errors: Array<Object>, summary: Object }}
     */
    static validate(data, schema, options = {}) {
      const opts = {
        strictTypes: true,
        detectAnomalies: true,
        allowAdditionalProperties: schema.additionalProperties !== false,
        ...options,
      };

      const errors = [];
      let totalChecks = 0;

      function addError(path, message, code, expected, actual, severity = 'ERROR') {
        errors.push({
          path: path || '#root',
          message,
          code,
          expected,
          actual: actual === undefined ? 'undefined' : actual,
          severity,
        });
      }

      function checkValueAnomalies(value, path) {
        if (!opts.detectAnomalies) return;

        // String anomalies
        if (typeof value === 'string') {
          if (value === 'NaN' || value === 'null' || value === 'undefined' || value === '[object Object]') {
            addError(
              path,
              `Potential serialization bug detected: literal string value "${value}"`,
              'ANOMALY_STRING_SERIALIZATION',
              'Valid domain value',
              value,
              'WARNING'
            );
          }
        }

        // Number anomalies
        if (typeof value === 'number') {
          if (Number.isNaN(value) || !Number.isFinite(value)) {
            addError(
              path,
              `Invalid numeric value: ${value}`,
              'ANOMALY_INVALID_NUMBER',
              'Finite number',
              String(value),
              'ERROR'
            );
          }
        }
      }

      function walk(val, sch, currentPath) {
        totalChecks++;

        if (!sch || typeof sch !== 'object') return;

        const actualType = getType(val);

        // Anomaly checks
        checkValueAnomalies(val, currentPath);

        // Required Type Check
        if (sch.type) {
          const expectedTypes = Array.isArray(sch.type) ? sch.type : [sch.type];
          let typeMatch = false;

          for (const exp of expectedTypes) {
            if (exp === 'number' && (actualType === 'number' || actualType === 'integer')) {
              typeMatch = true;
              break;
            }
            if (exp === 'integer' && actualType === 'integer') {
              typeMatch = true;
              break;
            }
            if (exp === actualType) {
              typeMatch = true;
              break;
            }
          }

          if (!typeMatch) {
            addError(
              currentPath,
              `Expected type "${expectedTypes.join(' | ')}", received "${actualType}"`,
              'TYPE_MISMATCH',
              expectedTypes.join(' | '),
              actualType
            );
            return; // Type mismatch short-circuits nested property inspection
          }
        }

        // Null checks
        if (val === null) {
          if (sch.nullable === false) {
            addError(currentPath, 'Field cannot be null (nullable: false)', 'NULL_NOT_ALLOWED', 'non-null', 'null');
          }
          return;
        }

        // Enum Check
        if (Array.isArray(sch.enum)) {
          totalChecks++;
          if (!sch.enum.includes(val)) {
            addError(
              currentPath,
              `Value "${val}" is not in allowed enum: [${sch.enum.join(', ')}]`,
              'ENUM_VIOLATION',
              sch.enum,
              val
            );
          }
        }

        // String Constraints
        if (actualType === 'string') {
          if (sch.minLength !== undefined && val.length < sch.minLength) {
            totalChecks++;
            addError(
              currentPath,
              `String length ${val.length} is shorter than minimum allowed (${sch.minLength})`,
              'MIN_LENGTH',
              `>= ${sch.minLength}`,
              val.length
            );
          }
          if (sch.maxLength !== undefined && val.length > sch.maxLength) {
            totalChecks++;
            addError(
              currentPath,
              `String length ${val.length} exceeds maximum allowed (${sch.maxLength})`,
              'MAX_LENGTH',
              `<= ${sch.maxLength}`,
              val.length
            );
          }
          if (sch.pattern) {
            totalChecks++;
            const regex = typeof sch.pattern === 'string' ? new RegExp(sch.pattern) : sch.pattern;
            if (!regex.test(val)) {
              addError(
                currentPath,
                `String "${val}" does not match pattern ${sch.pattern}`,
                'PATTERN_MISMATCH',
                String(sch.pattern),
                val
              );
            }
          }
          if (sch.format) {
            totalChecks++;
            if (sch.format === 'email' && !EMAIL_REGEX.test(val)) {
              addError(currentPath, `Invalid email format: "${val}"`, 'FORMAT_EMAIL', 'valid email', val);
            } else if (sch.format === 'date-time' && !ISO_DATE_REGEX.test(val)) {
              addError(currentPath, `Invalid ISO-8601 date-time: "${val}"`, 'FORMAT_DATETIME', 'ISO-8601 string', val);
            } else if (sch.format === 'uuid' && !UUID_REGEX.test(val)) {
              addError(currentPath, `Invalid UUID format: "${val}"`, 'FORMAT_UUID', 'UUID string', val);
            }
          }
        }

        // Numeric Constraints
        if (actualType === 'number' || actualType === 'integer') {
          if (sch.minimum !== undefined && val < sch.minimum) {
            totalChecks++;
            addError(
              currentPath,
              `Value ${val} is less than minimum allowed (${sch.minimum})`,
              'MINIMUM_VIOLATION',
              `>= ${sch.minimum}`,
              val
            );
          }
          if (sch.maximum !== undefined && val > sch.maximum) {
            totalChecks++;
            addError(
              currentPath,
              `Value ${val} exceeds maximum allowed (${sch.maximum})`,
              'MAXIMUM_VIOLATION',
              `<= ${sch.maximum}`,
              val
            );
          }
        }

        // Object Properties Validation
        if (actualType === 'object' && val !== null) {
          const keys = Object.keys(val);

          // Required fields
          if (Array.isArray(sch.required)) {
            for (const reqKey of sch.required) {
              totalChecks++;
              const propPath = currentPath ? `${currentPath}.${reqKey}` : reqKey;
              if (!(reqKey in val) || val[reqKey] === undefined) {
                addError(
                  propPath,
                  `Missing required object property: "${reqKey}"`,
                  'MISSING_REQUIRED_KEY',
                  'present',
                  'undefined'
                );
              }
            }
          }

          // Properties traversal
          if (sch.properties) {
            for (const propName of Object.keys(sch.properties)) {
              if (propName in val) {
                const propPath = currentPath ? `${currentPath}.${propName}` : propName;
                walk(val[propName], sch.properties[propName], propPath);
              }
            }
          }

          // Additional Properties restriction
          if (sch.additionalProperties === false) {
            const allowedKeys = new Set([
              ...(sch.properties ? Object.keys(sch.properties) : []),
              ...(Array.isArray(sch.required) ? sch.required : []),
            ]);
            for (const k of keys) {
              if (!allowedKeys.has(k)) {
                totalChecks++;
                const extraPath = currentPath ? `${currentPath}.${k}` : k;
                addError(
                  extraPath,
                  `Unexpected additional property "${k}"`,
                  'ADDITIONAL_PROPERTY',
                  'not present',
                  k,
                  'WARNING'
                );
              }
            }
          }
        }

        // Array Items Validation
        if (actualType === 'array') {
          if (sch.minItems !== undefined && val.length < sch.minItems) {
            totalChecks++;
            addError(
              currentPath,
              `Array length (${val.length}) is below minItems (${sch.minItems})`,
              'MIN_ITEMS',
              `>= ${sch.minItems}`,
              val.length
            );
          }
          if (sch.maxItems !== undefined && val.length > sch.maxItems) {
            totalChecks++;
            addError(
              currentPath,
              `Array length (${val.length}) exceeds maxItems (${sch.maxItems})`,
              'MAX_ITEMS',
              `<= ${sch.maxItems}`,
              val.length
            );
          }
          if (sch.items && typeof sch.items === 'object') {
            for (let i = 0; i < val.length; i++) {
              const itemPath = `${currentPath}[${i}]`;
              walk(val[i], sch.items, itemPath);
            }
          }
        }
      }

      walk(data, schema, '');

      const fatalErrors = errors.filter((e) => e.severity === 'ERROR');

      return {
        valid: fatalErrors.length === 0,
        errors,
        summary: {
          totalChecks,
          passedChecks: totalChecks - errors.length,
          errorCount: fatalErrors.length,
          warningCount: errors.length - fatalErrors.length,
        },
      };
    }
  }

  return JsonSchemaValidator;
});
