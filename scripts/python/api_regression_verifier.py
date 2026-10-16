#!/usr/bin/env python3
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

# ==========================================
# CONSTANTS & JSON CONTRACT SCHEMAS
# ==========================================
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
    },
    "additionalProperties": True
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

SCHEMA_PRODUCTS_LIST = {
    "type": "object",
    "required": ["items", "total"],
    "properties": {
        "items": {
            "type": "array",
            "items": SCHEMA_PRODUCT_ITEM
        },
        "total": {"type": "integer", "minimum": 0}
    }
}

SCHEMA_ERROR_RESPONSE = {
    "type": "object",
    "required": ["error", "statusCode"],
    "properties": {
        "error": {"type": "string"},
        "statusCode": {"type": "integer"},
        "message": {"type": "string"},
        "timestamp": {"type": "string"}
    }
}

# ==========================================
# RUNNER & ASSERTION SUITE
# ==========================================
class APIRegressionVerifier:
    def __init__(self, base_url: str = DEFAULT_BASE_URL, sla_ms: float = SLA_THRESHOLD_MS, verbose: bool = True):
        self.base_url = base_url.rstrip("/")
        self.sla_ms = sla_ms
        self.verbose = verbose
        self.results: List[Dict[str, Any]] = []
        self.auth_token: Optional[str] = None
        self.session = requests.Session()

    def log(self, message: str, status: Optional[str] = None):
        if not self.verbose:
            return
        if status == "PASS":
            prefix = "\033[92m[PASS]\033[0m"
        elif status == "FAIL":
            prefix = "\033[91m[FAIL]\033[0m"
        elif status == "WARN":
            prefix = "\033[93m[WARN]\033[0m"
        elif status == "INFO":
            prefix = "\033[94m[INFO]\033[0m"
        else:
            prefix = "[LOG]"
        print(f"{prefix} {message}")

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
            "body": body,
            "response_obj": response
        }

    def verify_security_headers(self, headers: Dict[str, str]) -> List[str]:
        violations = []
        expected = {
            "x-content-type-options": "nosniff",
            "x-frame-options": ["DENY", "SAMEORIGIN"],
        }
        for header, expected_val in expected.items():
            actual = headers.get(header.lower()) or headers.get(header)
            if not actual:
                violations.append(f"Missing header: {header}")
            elif isinstance(expected_val, list) and actual.upper() not in [v.upper() for v in expected_val]:
                violations.append(f"Header {header} was '{actual}', expected one of {expected_val}")
            elif isinstance(expected_val, str) and actual.lower() != expected_val.lower():
                violations.append(f"Header {header} was '{actual}', expected '{expected_val}'")
        return violations

    def test_01_health_and_security_headers(self) -> bool:
        self.log("Step 1: Testing Health Endpoint & Security Headers (GET /health)", "INFO")
        res = self.execute_request("GET", "/health")
        passed = True
        failures = []

        # 1. HTTP 200
        if res["status_code"] != 200:
            failures.append(f"Expected HTTP 200, got {res['status_code']}")
            passed = False

        # 2. SLA < 300ms
        if res["duration_ms"] > self.sla_ms:
            failures.append(f"Response time {res['duration_ms']}ms breached SLA ({self.sla_ms}ms)")
            passed = False

        # 3. Security Headers
        sec_violations = self.verify_security_headers(res["headers"])
        if sec_violations:
            failures.extend(sec_violations)
            passed = False

        # 4. JSON Schema Contract
        try:
            validate(instance=res["body"], schema=SCHEMA_HEALTH)
        except ValidationError as err:
            failures.append(f"JSON Schema Violation: {err.message} at '{'.'.join(str(p) for p in err.path)}'")
            passed = False

        status = "PASS" if passed else "FAIL"
        self.log(f"Health Check: {res['status_code']} in {res['duration_ms']}ms", status)
        if failures:
            for f in failures:
                self.log(f"  - {f}", "FAIL")

        self.results.append({
            "step": "Health & Security Headers",
            "passed": passed,
            "status_code": res["status_code"],
            "duration_ms": res["duration_ms"],
            "failures": failures
        })
        return passed

    def test_02_authentication_flow(self) -> bool:
        self.log("Step 2: Testing Authentication & Token Retrieval (POST /auth/login)", "INFO")
        payload = {"username": "qa.engineer", "password": "SecurePassword2026!"}
        res = self.execute_request("POST", "/auth/login", json=payload)
        passed = True
        failures = []

        if res["status_code"] != 200:
            failures.append(f"Expected HTTP 200, got {res['status_code']}")
            passed = False

        if res["duration_ms"] > self.sla_ms:
            failures.append(f"Response time {res['duration_ms']}ms breached SLA")
            passed = False

        try:
            validate(instance=res["body"], schema=SCHEMA_AUTH_RESPONSE)
            self.auth_token = res["body"].get("token")
        except ValidationError as err:
            failures.append(f"Auth Contract Violation: {err.message}")
            passed = False

        status = "PASS" if passed else "FAIL"
        self.log(f"Auth Flow: {res['status_code']} in {res['duration_ms']}ms | Token obtained: {bool(self.auth_token)}", status)
        if failures:
            for f in failures:
                self.log(f"  - {f}", "FAIL")

        self.results.append({
            "step": "Authentication Flow",
            "passed": passed,
            "status_code": res["status_code"],
            "duration_ms": res["duration_ms"],
            "failures": failures
        })
        return passed

    def test_03_get_catalog_and_schema_types(self) -> bool:
        self.log("Step 3: Testing Catalog Retrieval & Item Schemas (GET /products)", "INFO")
        res = self.execute_request("GET", "/products")
        passed = True
        failures = []

        if res["status_code"] != 200:
            failures.append(f"Expected HTTP 200, got {res['status_code']}")
            passed = False

        if res["duration_ms"] > self.sla_ms:
            failures.append(f"Response time {res['duration_ms']}ms breached SLA")
            passed = False

        try:
            validate(instance=res["body"], schema=SCHEMA_PRODUCTS_LIST)
        except ValidationError as err:
            failures.append(f"Product List Contract Violation: {err.message} at '{'.'.join(str(p) for p in err.path)}'")
            passed = False

        status = "PASS" if passed else "FAIL"
        items_count = len(res["body"].get("items", [])) if isinstance(res["body"], dict) else 0
        self.log(f"Catalog Integrity: {res['status_code']} in {res['duration_ms']}ms | Verified {items_count} items", status)
        if failures:
            for f in failures:
                self.log(f"  - {f}", "FAIL")

        self.results.append({
            "step": "Catalog Schema Integrity",
            "passed": passed,
            "status_code": res["status_code"],
            "duration_ms": res["duration_ms"],
            "failures": failures
        })
        return passed

    def test_04_create_resource_contract(self) -> bool:
        self.log("Step 4: Creating Resource & Contract Validation (POST /products)", "INFO")
        new_product = {
            "name": "Regression Test Fixture Hub",
            "sku": f"QA-TEST-{int(time.time())}",
            "price": 149.99,
            "currency": "PLN",
            "inStock": True,
            "category": "Testing Equipment"
        }
        res = self.execute_request("POST", "/products", json=new_product)
        passed = True
        failures = []

        # Expect 201 Created
        if res["status_code"] != 201:
            failures.append(f"Expected HTTP 201 Created, got {res['status_code']}")
            passed = False

        try:
            validate(instance=res["body"], schema=SCHEMA_PRODUCT_ITEM)
            self.created_product_id = res["body"].get("id")
        except ValidationError as err:
            failures.append(f"Created Product Contract Violation: {err.message}")
            passed = False

        status = "PASS" if passed else "FAIL"
        self.log(f"Resource Creation: {res['status_code']} in {res['duration_ms']}ms | Created ID: {res['body'].get('id', 'N/A')}", status)
        if failures:
            for f in failures:
                self.log(f"  - {f}", "FAIL")

        self.results.append({
            "step": "Create Resource Contract (201)",
            "passed": passed,
            "status_code": res["status_code"],
            "duration_ms": res["duration_ms"],
            "failures": failures
        })
        return passed

    def test_05_negative_scenarios_and_error_codes(self) -> bool:
        self.log("Step 5: Testing Negative Scenarios (400 Bad Request, 401 Unauthorized, 404 Not Found)", "INFO")
        all_passed = True
        failures = []

        # Sub-test 5A: 400 Bad Request with malformed payload
        bad_res = self.execute_request("POST", "/products", json={"price": "not_a_number"})
        if bad_res["status_code"] != 400:
            failures.append(f"Expected HTTP 400 on invalid payload, got {bad_res['status_code']}")
            all_passed = False

        # Sub-test 5B: 404 Not Found
        missing_res = self.execute_request("GET", "/products/non-existent-uuid-99999")
        if missing_res["status_code"] != 404:
            failures.append(f"Expected HTTP 404 on missing entity, got {missing_res['status_code']}")
            all_passed = False

        # Sub-test 5C: 401 Unauthorized
        unauth_session = requests.Session()
        unauth_res = unauth_session.get(f"{self.base_url}/products/secure-admin-view")
        if unauth_res.status_code not in (401, 403):
            failures.append(f"Expected HTTP 401/403 for unauthorized route, got {unauth_res.status_code}")
            all_passed = False

        status = "PASS" if all_passed else "FAIL"
        self.log(f"Negative Boundary Checks: status={status}", status)
        if failures:
            for f in failures:
                self.log(f"  - {f}", "FAIL")

        self.results.append({
            "step": "Negative Boundary & HTTP Status Codes (400, 401, 404)",
            "passed": all_passed,
            "status_code": bad_res["status_code"],
            "duration_ms": bad_res["duration_ms"],
            "failures": failures
        })
        return all_passed

    def run_all(self) -> bool:
        print("=" * 70)
        print(" WEB QA AUTOMATION SCRIPTS - REGRESSION VERIFICATION SUITE")
        print(f" Target URL : {self.base_url}")
        print(f" SLA Limit  : < {self.sla_ms}ms")
        print(f" Timestamp  : {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)

        t1 = self.test_01_health_and_security_headers()
        t2 = self.test_02_authentication_flow()
        t3 = self.test_03_get_catalog_and_schema_types()
        t4 = self.test_04_create_resource_contract()
        t5 = self.test_05_negative_scenarios_and_error_codes()

        all_ok = all([t1, t2, t3, t4, t5])
        print("=" * 70)
        total = len(self.results)
        passed_count = sum(1 for r in self.results if r["passed"])
        failed_count = total - passed_count
        print(f" SUITE SUMMARY: {passed_count}/{total} PASSED, {failed_count} FAILED")
        verdict = "\033[92mSUCCESS\033[0m" if all_ok else "\033[91mREGRESSION DETECTED\033[0m"
        print(f" FINAL VERDICT: {verdict}")
        print("=" * 70)
        return all_ok

    def export_report(self, filepath: str = "regression_report_python.json"):
        report = {
            "suite": "web-qa-automation-scripts",
            "author": "Szymon Kochanowski",
            "targetUrl": self.base_url,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "totalTests": len(self.results),
            "passed": sum(1 for r in self.results if r["passed"]),
            "failed": sum(1 for r in self.results if not r["passed"]),
            "results": self.results
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        self.log(f"Report exported to {filepath}", "INFO")


# ==========================================
# PYTEST INTEGRATION HOOKS
# ==========================================
def test_pytest_health_check():
    verifier = APIRegressionVerifier(verbose=False)
    assert verifier.test_01_health_and_security_headers() is True

def test_pytest_auth_flow():
    verifier = APIRegressionVerifier(verbose=False)
    assert verifier.test_02_authentication_flow() is True

def test_pytest_catalog_schema():
    verifier = APIRegressionVerifier(verbose=False)
    assert verifier.test_03_get_catalog_and_schema_types() is True

def test_pytest_create_contract():
    verifier = APIRegressionVerifier(verbose=False)
    assert verifier.test_04_create_resource_contract() is True

def test_pytest_negative_boundaries():
    verifier = APIRegressionVerifier(verbose=False)
    assert verifier.test_05_negative_scenarios_and_error_codes() is True


# ==========================================
# CLI ENTRYPOINT
# ==========================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Web QA API Regression Verifier by Szymon Kochanowski")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Target API Base URL (default: http://localhost:3000/api/mock)")
    parser.add_argument("--sla", type=float, default=SLA_THRESHOLD_MS, help="SLA response time in ms (default: 300)")
    parser.add_argument("--export", default="regression_report_python.json", help="Path to write JSON summary report")
    parser.add_argument("--quiet", action="store_true", help="Quiet output mode")

    args = parser.parse_args()
    verifier = APIRegressionVerifier(base_url=args.url, sla_ms=args.sla, verbose=not args.quiet)
    success = verifier.run_all()
    verifier.export_report(args.export)
    sys.exit(0 if success else 1)
