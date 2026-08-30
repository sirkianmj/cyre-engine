/**
 * SimulationWindows
 * ------------------
 * Windows that drive the canonical engine simulation: transport and seed,
 * the attack chain, detection & response, and live host state inspection.
 * Every control calls straight through to `StudioApplication`.
 */

import { useState } from 'react';

import { ATTACK_CHAIN, CYBER_ACTIONS } from '../studio/services/CyberSessionService';
import type { CyberActionId } from '../studio/services/CyberSessionService';
import { useStudio } from '../studio/StudioContext';
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  EmptyState,
  Field,
  KeyValue,
  PanelHeader,
  Section,
  Segmented,
  Stat,
  TextField,
} from '../ui/primitives';

const SPEED_OPTIONS = [
  { value: '0.25', label: '0.25×' },
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' },
];

/* ---------------------------------------------------- Simulation Control */

export function SimulationWindow(): JSX.Element {
  const { state, application, runCommand, notify } = useStudio();
  const session = state.cyberSession;
  const [seedText, setSeedText] = useState(String(session.seed));
  const seedError = /^\d+$/.test(seedText.trim()) ? null : 'Seed must be a non-negative integer.';

  const applySeed = (): void => {
    if (seedError) return;
    try {
      application.startCyberSimulationForSelectedScenario(Number(seedText.trim()));
      notify('success', `Simulation restarted with seed ${seedText.trim()}.`);
    } catch (error) {
      notify('error', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Simulation Control"
        subtitle="Transport, deterministic seed and step mode for the canonical CYRE simulation runtime."
      />

      <div className="cyre-grid" data-columns="4">
        <Stat label="State" value={state.isPlaying ? 'RUNNING' : state.isPaused ? 'PAUSED' : 'STOPPED'} />
        <Stat label="Seed" value={session.seed} />
        <Stat label="Time" value={`${session.time} ms`} />
        <Stat label="Actions" value={session.actionsExecuted} />
      </div>

      <Section title="Transport">
        <div className="cyre-row">
          <Button icon="play" variant="primary" onClick={() => runCommand('simulation.play')}>Play</Button>
          <Button icon="pause" onClick={() => runCommand('simulation.pause')} disabled={!state.isPlaying}>Pause</Button>
          <Button icon="play" onClick={() => runCommand('simulation.resume')} disabled={!state.isPaused}>Resume</Button>
          <Button icon="stop" onClick={() => runCommand('simulation.stop')}>Stop</Button>
          <Button icon="restart" onClick={() => runCommand('simulation.restart')}>Restart</Button>
          <Button icon="step-forward" onClick={() => runCommand('simulation.step')} disabled={!session.active}>
            Step
          </Button>
        </div>
      </Section>

      <Section title="Speed & step mode">
        <div className="cyre-row" data-between="true">
          <Segmented
            ariaLabel="Simulation speed"
            value={String(state.simulationSpeed)}
            options={SPEED_OPTIONS}
            testId="simulation-speed"
            onChange={(value) => runCommand(`simulation.speed.${value}`)}
          />
          <Checkbox
            label="Step mode (advance one deterministic tick at a time)"
            checked={session.stepMode}
            testId="simulation-step-mode"
            onChange={(checked) => application.setStepMode(checked)}
          />
        </div>
      </Section>

      <Section title="Deterministic seed">
        <div className="cyre-grid" data-columns="2">
          <TextField
            label="Seed"
            value={seedText}
            onChange={setSeedText}
            invalid={Boolean(seedError)}
            hint={seedError ?? 'Re-initialises the simulation from the selected scenario.'}
            testId="simulation-seed"
          />
          <Field label="Scenario">
            <input className="cyre-input" value={session.scenarioName} readOnly disabled />
          </Field>
        </div>
        <div className="cyre-row">
          <Button variant="primary" onClick={applySeed} disabled={Boolean(seedError)}>
            Apply seed
          </Button>
          <Button onClick={() => runCommand('scenario.run')}>Run selected scenario</Button>
          <Button
            onClick={() => {
              const next = Math.floor(Math.random() * 100000);
              setSeedText(String(next));
            }}
          >
            Randomize
          </Button>
        </div>
      </Section>

      {session.lastError ? <Banner tone="danger">{session.lastError}</Banner> : null}

      <Section title="Event history">
        {session.state && session.state.monitoring.logs.length > 0 ? (
          <div className="cyre-table-wrap">
            <table className="cyre-table">
              <thead>
                <tr>
                  <th>t</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {[...session.state.monitoring.logs].reverse().map((log, index) => (
                  <tr key={`${log.type}-${log.timestamp}-${index}`}>
                    <td data-mono="true">{log.timestamp}</td>
                    <td>{log.type}</td>
                    <td>{log.source}</td>
                    <td>{log.target ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="activity"
            title="No simulation events yet"
            body="Play the simulation or execute an attack action to populate the event history."
          />
        )}
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------- Attack Chain */

export function AttackWindow(): JSX.Element {
  const { state, application } = useStudio();
  const session = state.cyberSession;

  if (!session.active || !session.state) {
    return (
      <div className="cyre-panel">
        <PanelHeader title="Attack Chain" subtitle="Execute the canonical attack chain against the live simulation state." />
        <EmptyState
          icon="attack"
          title="No active simulation"
          body="Start the simulation to execute attack actions against real engine state."
          action={<Button variant="primary" icon="play" onClick={() => application.play()}>Play simulation</Button>}
        />
      </div>
    );
  }

  const availability = new Map(state.cyberActionAvailability.map((entry) => [entry.id, entry]));
  const stageIndex = ATTACK_CHAIN.findIndex((step) => !availability.get(step)?.available);

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Attack Chain"
        subtitle="Each step calls the matching CyberSimulation method and mutates real state."
        actions={<Badge tone="accent">{session.state.attackStage}</Badge>}
      />

      <div className="cyre-grid" data-columns="3">
        <Stat label="Attacker" value={session.state.attacker.position} />
        <Stat label="Privileges" value={session.state.attacker.privileges} />
        <Stat label="Objective" value={session.state.objective.achieved ? 'ACHIEVED' : 'OPEN'} />
      </div>

      <Section title="Canonical chain">
        <div className="cyre-list">
          {ATTACK_CHAIN.map((actionId, index) => {
            const entry = availability.get(actionId);
            const done = entry ? entry.available === false && entry.reason === null : false;

            return (
              <div key={actionId} className="cyre-list-row">
                <Badge tone={done ? 'success' : index === stageIndex ? 'accent' : 'neutral'}>{index + 1}</Badge>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{entry?.label ?? actionId}</span>
                  <span className="cyre-list-meta">{entry?.reason ?? entry?.description}</span>
                </span>
                <Button
                  size="sm"
                  disabled={!entry?.available}
                  testId={`attack-${actionId}`}
                  onClick={() => {
                    try {
                      application.executeCyberAction(actionId as CyberActionId);
                    } catch {
                      /* surfaced through the notification trail */
                    }
                  }}
                >
                  Execute
                </Button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Detected services">
        {session.state.attacker.discoveredServices.length > 0 ? (
          <div className="cyre-row">
            {session.state.attacker.discoveredServices.map((service) => (
              <Badge key={service} tone="info">{service}</Badge>
            ))}
          </div>
        ) : (
          <span className="cyre-list-meta">No services discovered yet.</span>
        )}
      </Section>

      {session.lastError ? <Banner tone="danger">{session.lastError}</Banner> : null}
    </div>
  );
}

/* ------------------------------------------------- Detection & Response */

export function DetectionWindow(): JSX.Element {
  const { state, application } = useStudio();
  const session = state.cyberSession;
  const [blockSource, setBlockSource] = useState('');
  const [blockTarget, setBlockTarget] = useState('');

  if (!session.active || !session.state) {
    return (
      <div className="cyre-panel">
        <PanelHeader title="Detection & Response" subtitle="Alerts, evidence and defender containment actions." />
        <EmptyState
          icon="shield"
          title="No active simulation"
          body="Start the simulation to run detection rules and apply defensive actions."
          action={<Button variant="primary" icon="play" onClick={() => application.play()}>Play simulation</Button>}
        />
      </div>
    );
  }

  const hosts = Object.values(session.state.hosts);
  const alerts = session.state.alerts;
  const evidence = session.state.evidence;

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Detection & Response"
        subtitle="Run detection rules over the monitoring log, then contain the incident."
        actions={
          <Button
            variant="primary"
            icon="shield"
            testId="detection-run"
            onClick={() => {
              try {
                application.executeCyberAction('detectThreats');
              } catch {
                /* surfaced through the notification trail */
              }
            }}
          >
            Run detection
          </Button>
        }
      />

      <div className="cyre-grid" data-columns="4">
        <Stat label="Alerts" value={alerts.length} />
        <Stat label="New" value={alerts.filter((alert) => alert.status === 'new').length} />
        <Stat label="Evidence" value={evidence.length} />
        <Stat label="Defender actions" value={session.state.defenderActions.length} />
      </div>

      <Section title="Alerts">
        {alerts.length === 0 ? (
          <EmptyState icon="shield" title="No alerts" body="Run detection to evaluate the monitoring log." />
        ) : (
          <div className="cyre-table-wrap">
            <table className="cyre-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Badge
                        tone={
                          alert.severity === 'critical'
                            ? 'danger'
                            : alert.severity === 'high'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </td>
                    <td>{alert.title}</td>
                    <td>{alert.sourceId}</td>
                    <td>{alert.status}</td>
                    <td>
                      <Button
                        size="sm"
                        disabled={alert.status !== 'new'}
                        testId={`alert-investigate-${alert.id}`}
                        onClick={() => {
                          try {
                            application.executeCyberAction('investigateAlert', { alertId: alert.id });
                          } catch {
                            /* surfaced through the notification trail */
                          }
                        }}
                      >
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Evidence">
        {evidence.length === 0 ? (
          <EmptyState icon="search" title="No evidence collected" body="Detection has not produced evidence yet." />
        ) : (
          <div className="cyre-list">
            {evidence.map((item) => (
              <div key={item.id} className="cyre-list-row">
                <Badge tone="info">{item.type}</Badge>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{item.description}</span>
                  <span className="cyre-list-meta">
                    {item.sourceId} · t={item.timestamp}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Containment">
        <div className="cyre-grid" data-columns="2">
          <div className="cyre-list">
            {hosts.map((host) => (
              <div key={host.id} className="cyre-list-row">
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{host.name}</span>
                  <span className="cyre-list-meta">
                    {host.type} · {host.isolated ? 'isolated' : 'connected'}
                    {host.compromised ? ' · compromised' : ''}
                  </span>
                </span>
                <Button
                  size="sm"
                  disabled={host.isolated}
                  testId={`isolate-${host.id}`}
                  onClick={() => {
                    try {
                      application.executeCyberAction('isolateHost', { hostId: host.id });
                    } catch {
                      /* surfaced through the notification trail */
                    }
                  }}
                >
                  Isolate
                </Button>
                <Button
                  size="sm"
                  disabled={!host.isolated && !host.compromised && host.accessLevel === 'none'}
                  testId={`restore-${host.id}`}
                  onClick={() => {
                    try {
                      application.executeCyberAction('restoreHost', { hostId: host.id });
                    } catch {
                      /* surfaced through the notification trail */
                    }
                  }}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>

          <div className="cyre-card">
            <span className="cyre-section-title">Block network path</span>
            <div className="cyre-grid" data-columns="2">
              <Field label="Source">
                <select
                  className="cyre-select"
                  value={blockSource}
                  data-testid="block-source"
                  onChange={(event) => setBlockSource(event.target.value)}
                >
                  <option value="">Select host…</option>
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>{host.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target">
                <select
                  className="cyre-select"
                  value={blockTarget}
                  data-testid="block-target"
                  onChange={(event) => setBlockTarget(event.target.value)}
                >
                  <option value="">Select host…</option>
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>{host.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Button
              icon="lock"
              disabled={!blockSource || !blockTarget || blockSource === blockTarget}
              testId="block-path"
              onClick={() => {
                try {
                  application.executeCyberAction('blockNetworkPath', {
                    sourceId: blockSource,
                    targetId: blockTarget,
                  });
                } catch {
                  /* surfaced through the notification trail */
                }
              }}
            >
              Block path
            </Button>

            {session.state.blockedPaths.length > 0 ? (
              <div className="cyre-row">
                {session.state.blockedPaths.map((path) => (
                  <Badge key={`${path.source}-${path.target}`} tone="warning">
                    {path.source} → {path.target}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------- Host Inspector */

export function HostsWindow(): JSX.Element {
  const { state, application } = useStudio();
  const session = state.cyberSession;

  if (!session.active || !session.state) {
    return (
      <div className="cyre-panel">
        <PanelHeader title="Host Inspector" subtitle="Live per-host state read directly from the simulation." />
        <EmptyState
          icon="server"
          title="No active simulation"
          body="Start the simulation to inspect live host state."
          action={<Button variant="primary" icon="play" onClick={() => application.play()}>Play simulation</Button>}
        />
      </div>
    );
  }

  const hosts = Object.values(session.state.hosts);
  const compromised = hosts.filter((host) => host.compromised).length;
  const isolated = hosts.filter((host) => host.isolated).length;

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Host Inspector"
        subtitle="State inspection for every host in the running simulation."
        actions={<Badge tone="accent">{session.scenarioName}</Badge>}
      />

      <div className="cyre-grid" data-columns="4">
        <Stat label="Hosts" value={hosts.length} />
        <Stat label="Compromised" value={compromised} />
        <Stat label="Isolated" value={isolated} />
        <Stat label="Stage" value={session.state.attackStage} />
      </div>

      <Section title="Attacker">
        <KeyValue
          entries={[
            ['Position', session.state.attacker.position],
            ['Privileges', session.state.attacker.privileges],
            ['Discovered', session.state.attacker.discoveredServices.join(', ') || '—'],
            ['Objective', session.state.objective.targetHostId],
            ['Achieved', session.state.objective.achieved ? 'yes' : 'no'],
            ['Seed', session.seed],
            ['Time', `${session.time} ms`],
            ['Steps', session.stepsExecuted],
          ]}
        />
      </Section>

      <Section title="Hosts">
        <div className="cyre-table-wrap">
          <table className="cyre-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Type</th>
                <th>Access</th>
                <th>Services</th>
                <th>Vulnerabilities</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => (
                <tr key={host.id} data-testid={`host-row-${host.id}`}>
                  <td>{host.name}</td>
                  <td>{host.type}</td>
                  <td>{host.accessLevel}</td>
                  <td data-mono="true">{host.services.map((service) => `${service.name}:${service.port}`).join(', ') || '—'}</td>
                  <td data-mono="true">{host.vulnerabilities.join(', ') || '—'}</td>
                  <td>
                    <span className="cyre-row">
                      {host.compromised ? <Badge tone="danger">compromised</Badge> : null}
                      {host.isolated ? <Badge tone="warning">isolated</Badge> : null}
                      {!host.compromised && !host.isolated ? <Badge tone="success">clean</Badge> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="All engine actions">
        <div className="cyre-list">
          {CYBER_ACTIONS.map((action) => {
            const entry = state.cyberActionAvailability.find((item) => item.id === action.id);
            return (
              <div key={action.id} className="cyre-list-row">
                <Badge tone={action.group === 'attack' ? 'danger' : action.group === 'defense' ? 'success' : 'info'}>
                  {action.group}
                </Badge>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{action.label}</span>
                  <span className="cyre-list-meta">{entry?.reason ?? action.description}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
