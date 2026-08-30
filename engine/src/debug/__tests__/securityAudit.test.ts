import { describe, it, expect } from 'vitest';
import {
  SecurityAuditSystem,
  SECURITY_AUDIT_SEVERITIES,
  SECURITY_AUDIT_CATEGORIES,
  isSecurityAuditSeverity,
  isSecurityAuditCategory,
} from '../index.js';
import { NetworkGraph } from '../../cyber/index.js';

describe('SecurityAuditTypes', () => {
  it('exposes severities and categories', () => {
    expect(SECURITY_AUDIT_SEVERITIES).toEqual(['critical', 'warning', 'info']);
    expect(SECURITY_AUDIT_CATEGORIES).toContain('data-integrity');
    expect(isSecurityAuditSeverity('critical')).toBe(true);
    expect(isSecurityAuditCategory('input-validation')).toBe(true);
  });
});

describe('SecurityAuditSystem', () => {
  it('passes clean configuration and logger', () => {
    const audit = new SecurityAuditSystem({
      configuration: {
        appName: 'CYRE Engine',
        version: '1.0.0',
        logLevel: 'info',
      },
      logger: { getLevel: () => 'info' },
      errorHandlerRethrow: false,
      networkGraph: new NetworkGraph(),
    });

    const report = audit.audit();
    expect(report.criticalCount).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.summary).toContain('passed');
    expect(() => audit.validate()).not.toThrow();
  });

  it('detects invalid configuration and log level', () => {
    const report = new SecurityAuditSystem({
      configuration: {
        appName: '',
        version: '',
        logLevel: 'invalid',
      },
      logger: { getLevel: () => 'verbose' },
    }).audit();

    expect(report.criticalCount).toBeGreaterThanOrEqual(3);
    expect(report.passed).toBe(false);
  });

  it('detects dangerous input values', () => {
    const report = new SecurityAuditSystem({
      inputValues: [
        { name: 'message', value: '<script>alert(1)</script>' },
        { name: 'uri', value: 'javascript:alert(1)' },
        { name: 'path', value: '../../etc/passwd' },
      ],
    }).audit();

    expect(report.criticalCount).toBeGreaterThanOrEqual(2);
    expect(report.warningCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((issue) => issue.category === 'input-validation')).toBe(true);
  });

  it('detects dangerous and sensitive keys in serialized data', () => {
    const report = new SecurityAuditSystem({
      targets: [
        {
          name: 'config',
          value: {
            constructor: { polluted: true },
            apiKey: 'abc',
            normal: 'value',
          },
        },
      ],
    }).audit();

    expect(report.criticalCount).toBeGreaterThanOrEqual(1);
    expect(report.warningCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((issue) => issue.message.includes('dangerous key'))).toBe(true);
    expect(report.issues.some((issue) => issue.message.includes('sensitive key'))).toBe(true);
  });

  it('detects network graph validation issues', () => {
    const graph = new NetworkGraph();
    graph.addNode('a');
    graph.addNode('b');
    graph.addEdge('a', 'b');

    const report = new SecurityAuditSystem({ networkGraph: graph }).audit();
    expect(report.issues.some((issue) => issue.category === 'network')).toBe(false);

    const invalidGraph = new NetworkGraph();
    invalidGraph.addNode('a');
    Object.defineProperty(invalidGraph, 'getNodes', {
      value: () => [],
    });

    const report2 = new SecurityAuditSystem({ networkGraph: invalidGraph }).audit();
    expect(report2.issues.some((issue) => issue.category === 'network')).toBe(true);
  });

  it('warns on rethrow error handler', () => {
    const report = new SecurityAuditSystem({
      errorHandlerRethrow: true,
    }).audit();

    expect(report.warningCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((issue) => issue.category === 'error-handling')).toBe(true);
  });

  it('rejects invalid options and invalid instances', () => {
    expect(() => new SecurityAuditSystem({ name: '' })).toThrow(/name/);
    expect(() =>
      new SecurityAuditSystem({ logger: {} as any }).validate(),
    ).toThrow(/getLevel/);
    expect(() =>
      new SecurityAuditSystem({ networkGraph: {} as any }).validate(),
    ).toThrow(/NetworkGraph instance/);
  });

  it('validates cleanly', () => {
    const audit = new SecurityAuditSystem();
    expect(() => audit.validate()).not.toThrow();
  });
});
