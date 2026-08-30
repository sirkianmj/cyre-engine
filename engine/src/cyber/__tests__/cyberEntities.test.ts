import { describe, it, expect } from 'vitest';
import {
  Host,
  Server,
  Client,
  Router,
  Firewall,
  Database,
  Service,
  User,
  Account,
} from '../index.js';

describe('Cyber Entities', () => {
  it('creates a Host with valid properties', () => {
    const host = new Host('h1', 'WebServer', {
      os: 'Linux',
      ipAddress: '10.0.0.1',
      hostname: 'web.internal',
    });
    expect(host.id).toBe('h1');
    expect(host.name).toBe('WebServer');
    expect(host.type).toBe('Host');
    expect(host.os).toBe('Linux');
    expect(host.ipAddress).toBe('10.0.0.1');
    expect(host.hostname).toBe('web.internal');
  });

  it('creates a Server with overridden type', () => {
    const server = new Server('s1', 'DB1', { os: 'Windows' });
    expect(server.id).toBe('s1');
    expect(server.type).toBe('Server');
    expect(server.os).toBe('Windows');
  });

  it('creates a Client', () => {
    const client = new Client('c1', 'UserPC', { ipAddress: '192.168.1.50' });
    expect(client.type).toBe('Client');
    expect(client.ipAddress).toBe('192.168.1.50');
  });

  it('creates a Router with interfaces', () => {
    const router = new Router('r1', 'EdgeRouter', {
      ipAddress: '10.0.0.254',
      interfaces: ['eth0', 'eth1'],
    });
    expect(router.type).toBe('Router');
    expect(router.interfaces).toEqual(['eth0', 'eth1']);
  });

  it('throws on invalid IP address', () => {
    expect(() => new Host('h2', 'BadIP', { ipAddress: '999.1.1.1' })).toThrow(/Invalid IP/);
  });

  it('creates a Firewall', () => {
    const fw = new Firewall('fw1', 'PerimeterFW', { rulesetVersion: 'v1.2' });
    expect(fw.type).toBe('Firewall');
    expect(fw.rulesetVersion).toBe('v1.2');
  });

  it('creates a Database', () => {
    const db = new Database('db1', 'Postgres', { dbEngine: 'PostgreSQL', version: '14' });
    expect(db.type).toBe('Database');
    expect(db.dbEngine).toBe('PostgreSQL');
  });

  it('creates a Service with valid port', () => {
    const svc = new Service('svc1', 'HTTP', 80, 'tcp', { version: '1.1' });
    expect(svc.type).toBe('Service');
    expect(svc.port).toBe(80);
    expect(svc.protocol).toBe('tcp');
  });

  it('throws on invalid service port', () => {
    expect(() => new Service('svc2', 'BadPort', 0)).toThrow(/port/);
  });

  it('creates a User with valid email', () => {
    const user = new User('u1', 'Alice', { email: 'alice@example.com', role: 'admin' });
    expect(user.type).toBe('User');
    expect(user.email).toBe('alice@example.com');
    expect(user.role).toBe('admin');
  });

  it('throws on invalid email', () => {
    expect(() => new User('u2', 'Bob', { email: 'not-an-email' })).toThrow(/Invalid email/);
  });

  it('creates an Account', () => {
    const account = new Account('a1', 'alice', 'u1', { passwordHash: 'hash123' });
    expect(account.type).toBe('Account');
    expect(account.username).toBe('alice');
    expect(account.userId).toBe('u1');
    expect(account.passwordHash).toBe('hash123');
  });

  it('throws on empty username for Account', () => {
    expect(() => new Account('a2', '', 'u1')).toThrow(/non-empty/);
  });
});
