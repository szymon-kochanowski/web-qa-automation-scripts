import { ValidationResult } from '../utils/jsonValidator';

export interface FaultConfig {
  inject500: boolean;
  corruptSchema: boolean;
  injectLatency: boolean;
  rejectAuth: boolean;
  stripSecurityHeaders: boolean;
}

export interface StepAssertion {
  name: string;
  passed: boolean;
  message: string;
  expected?: string;
  actual?: string;
}

export interface TestStepResult {
  id: string;
  stepNumber: number;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  requestPayload?: any;
  status: number;
  durationMs: number;
  slaLimitMs: number;
  slaBreached: boolean;
  passed: boolean;
  assertions: StepAssertion[];
  validationResult?: ValidationResult;
  responseBody: any;
  responseHeaders: Record<string, string>;
  executedAt: string;
}

export interface SuiteSummary {
  runId: string;
  executedAt: string;
  targetUrl: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  totalDurationMs: number;
  slaBreachedCount: number;
  verdict: 'PASS' | 'FAIL';
  steps: TestStepResult[];
}

export interface ScriptItem {
  id: string;
  title: string;
  tech: 'Python' | 'Node.js' | 'JavaScript' | 'Postman';
  filename: string;
  description: string;
  cliCommand: string;
  code: string;
  badgeColor: string;
}
