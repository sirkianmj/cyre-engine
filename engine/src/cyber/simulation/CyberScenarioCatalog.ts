import type { CyberScenarioDefinition } from './CyberScenarioDefinition.js';

export const CYBER_SCENARIOS: CyberScenarioDefinition[] = [
  {
    id: 'lab-basic',
    name: 'Basic Laboratory Network',
    description: 'Small deterministic lab with a vulnerable web server and database target.',
    seed: 42,
    targetHostId: 'database-server',
    nodes: [
      { id: 'internet', name: 'Internet', type: 'internet' },
      { id: 'gateway', name: 'Gateway', type: 'gateway', services: [{ name: 'https', port: 443, protocol: 'tcp' }] },
      {
        id: 'web-server',
        name: 'Web Server',
        type: 'web_server',
        services: [
          { name: 'http', port: 80, protocol: 'tcp', vulnerability: 'CVE-2024-1234' },
        ],
        vulnerabilities: ['CVE-2024-1234'],
      },
      { id: 'database-server', name: 'Database Server', type: 'database_server', services: [{ name: 'postgresql', port: 5432, protocol: 'tcp' }] },
      { id: 'admin-workstation', name: 'Admin Workstation', type: 'admin_workstation' },
    ],
    connectionLogs: [
      { type: 'recon', source: 'internet', target: 'gateway' },
      { type: 'service_discovery', source: 'internet', target: 'web-server' },
      { type: 'exploit', source: 'internet', target: 'web-server' },
    ],
  },
  {
    id: 'fintech',
    name: 'Fintech Payment Network',
    description: 'Multi-segment financial network with internal services and database target.',
    seed: 77,
    targetHostId: 'core-db',
    nodes: [
      { id: 'internet', name: 'Internet', type: 'internet' },
      { id: 'edge-firewall', name: 'Edge Firewall', type: 'gateway', services: [{ name: 'https', port: 443, protocol: 'tcp' }] },
      { id: 'web-app', name: 'Web Application', type: 'web_server', services: [{ name: 'http', port: 80, protocol: 'tcp', vulnerability: 'CVE-2024-9999' }], vulnerabilities: ['CVE-2024-9999'] },
      { id: 'internal-switch', name: 'Internal Switch', type: 'internal_network' },
      { id: 'core-db', name: 'Core Database', type: 'database_server', services: [{ name: 'oracle', port: 1521, protocol: 'tcp' }] },
      { id: 'admin-pc', name: 'Admin Workstation', type: 'admin_workstation' },
    ],
    connectionLogs: [
      { type: 'recon', source: 'internet', target: 'edge-firewall' },
      { type: 'service_discovery', source: 'internet', target: 'web-app' },
      { type: 'exploit', source: 'internet', target: 'web-app' },
      { type: 'lateral_movement', source: 'web-app', target: 'internal-switch' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare Hospital Network',
    description: 'Hospital network with patient records system as protected target.',
    seed: 101,
    targetHostId: 'patient-db',
    nodes: [
      { id: 'internet', name: 'Internet', type: 'internet' },
      { id: 'vpn-gateway', name: 'VPN Gateway', type: 'gateway', services: [{ name: 'https', port: 443, protocol: 'tcp' }] },
      { id: 'clinical-portal', name: 'Clinical Portal', type: 'web_server', services: [{ name: 'http', port: 80, protocol: 'tcp', vulnerability: 'CVE-2024-5555' }], vulnerabilities: ['CVE-2024-5555'] },
      { id: 'patient-db', name: 'Patient Database', type: 'database_server', services: [{ name: 'postgresql', port: 5432, protocol: 'tcp' }] },
      { id: 'nurse-station', name: 'Nurse Station', type: 'admin_workstation' },
    ],
    connectionLogs: [
      { type: 'recon', source: 'internet', target: 'vpn-gateway' },
      { type: 'service_discovery', source: 'internet', target: 'clinical-portal' },
      { type: 'exploit', source: 'internet', target: 'clinical-portal' },
      { type: 'target_access', source: 'clinical-portal', target: 'patient-db' },
    ],
  },
];

export function findCyberScenario(id: string): CyberScenarioDefinition | undefined {
  return CYBER_SCENARIOS.find((scenario) => scenario.id === id);
}
