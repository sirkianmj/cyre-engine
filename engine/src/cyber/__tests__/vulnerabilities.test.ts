import { describe, it, expect } from 'vitest';
import {
  Vulnerability,
  VulnerabilityCatalog,
} from '../index.js';

describe('Vulnerability', () => {
  it('creates a vulnerability', () => {
    const v = new Vulnerability('v1', 'SQL Injection', 'critical', {
      cve: 'CVE-2024-1234',
      serviceId: 'svc1',
      hostId: 'h1',
    });
    expect(v.id).toBe('v1');
    expect(v.name).toBe('SQL Injection');
    expect(v.severity).toBe('critical');
    expect(v.cve).toBe('CVE-2024-1234');
    expect(v.serviceId).toBe('svc1');
    expect(v.hostId).toBe('h1');
  });

  it('throws on empty id or name', () => {
    expect(() => new Vulnerability('', 'Name', 'low')).toThrow(/non-empty/);
    expect(() => new Vulnerability('v1', '', 'low')).toThrow(/non-empty/);
  });

  it('throws on invalid severity', () => {
    expect(() => new Vulnerability('v1', 'Name', 'super' as any)).toThrow(/severity/);
  });

  it('throws on empty CVE if provided', () => {
    expect(() => new Vulnerability('v1', 'Name', 'low', { cve: '' })).toThrow(/CVE/);
  });
});

describe('VulnerabilityCatalog', () => {
  it('adds and retrieves vulnerabilities', () => {
    const catalog = new VulnerabilityCatalog();
    const v1 = new Vulnerability('v1', 'Weak Password', 'medium', { hostId: 'h1' });
    const v2 = new Vulnerability('v2', 'RCE', 'critical', { hostId: 'h1' });
    catalog.add(v1);
    catalog.add(v2);
    expect(catalog.get('v1')).toBe(v1);
    expect(catalog.getAll()).toHaveLength(2);
  });

  it('filters by host', () => {
    const catalog = new VulnerabilityCatalog();
    catalog.add(new Vulnerability('v1', 'Vuln1', 'low', { hostId: 'h1' }));
    catalog.add(new Vulnerability('v2', 'Vuln2', 'high', { hostId: 'h2' }));
    expect(catalog.findByHost('h1')).toHaveLength(1);
    expect(catalog.findByHost('h1')[0].id).toBe('v1');
  });

  it('filters by service', () => {
    const catalog = new VulnerabilityCatalog();
    catalog.add(new Vulnerability('v1', 'Vuln1', 'low', { serviceId: 'svc1' }));
    catalog.add(new Vulnerability('v2', 'Vuln2', 'high', { serviceId: 'svc2' }));
    expect(catalog.findByService('svc1')).toHaveLength(1);
  });

  it('filters by severity threshold', () => {
    const catalog = new VulnerabilityCatalog();
    catalog.add(new Vulnerability('v1', 'Low1', 'low'));
    catalog.add(new Vulnerability('v2', 'Medium1', 'medium'));
    catalog.add(new Vulnerability('v3', 'High1', 'high'));
    catalog.add(new Vulnerability('v4', 'Critical1', 'critical'));
    expect(catalog.findAboveSeverity('high')).toHaveLength(2);
  });

  it('throws on duplicate add', () => {
    const catalog = new VulnerabilityCatalog();
    catalog.add(new Vulnerability('v1', 'Vuln1', 'low'));
    expect(() => catalog.add(new Vulnerability('v1', 'Duplicate', 'low'))).toThrow(/already exists/);
  });

  it('removes vulnerability', () => {
    const catalog = new VulnerabilityCatalog();
    catalog.add(new Vulnerability('v1', 'Vuln1', 'low'));
    catalog.remove('v1');
    expect(catalog.get('v1')).toBeUndefined();
  });
});
