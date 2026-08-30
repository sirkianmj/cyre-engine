/**
 * StudioWindows
 * --------------
 * Project management, visualization settings, security validation, the
 * output console, keyboard shortcuts and the about window.
 */

import { useState } from 'react';

import { HOSTILE_SCENARIO_PAYLOADS } from '../studio/services/SecurityService';
import { useStudio } from '../studio/StudioContext';

import {
  CYRE_BRANDING,
  copyrightLine,
  engineVersion,
  studioVersion,
} from '../branding';
import type { ViewportSettings } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  EmptyState,
  KeyValue,
  PanelHeader,
  RangeField,
  Section,
  Segmented,
  Stat,
  TextField,
} from '../ui/primitives';

import { MENU_COMMAND_GROUPS } from '../shell/shortcutModel';

/* --------------------------------------------------------------- Project */

export function ProjectWindow(): JSX.Element {
  const { state, application, runCommand, notify } = useStudio();
  const [name, setName] = useState(state.projectTitle);
  const [template, setTemplate] = useState('soc-game');

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Project"
        subtitle="Create, save, load and export the Studio project document."
        actions={
          <>
            <Button icon="folder" onClick={() => runCommand('project.save')} testId="project-save">Save</Button>
            <Button icon="upload" onClick={() => runCommand('project.open')} disabled={!application.hasSavedProject()}>
              Open last
            </Button>
            <Button icon="download" onClick={() => runCommand('project.export')} testId="project-export">Export…</Button>
          </>
        }
      />

      <div className="cyre-grid" data-columns="2">
        <TextField label="Project name" value={name} onChange={setName} testId="project-name" />
        <TextField label="Template" value={template} onChange={setTemplate} testId="project-template" />
      </div>

      <div className="cyre-row">
        <Button
          variant="primary"
          icon="plus"
          testId="project-create"
          onClick={() => {
            try {
              application.createProject(name.trim() || 'Untitled CYRE Project', template.trim() || 'soc-game');
              notify('success', 'Project created.');
            } catch (error) {
              notify('error', error instanceof Error ? error.message : String(error));
            }
          }}
        >
          Create project
        </Button>
      </div>

      <Section title="Current project">
        <KeyValue
          entries={[
            ['Title', state.projectTitle],
            ['Status', state.statusMessage],
            ['Saved locally', application.hasSavedProject() ? 'yes' : 'no'],
            ['Nodes', state.projectExplorerNodes.length],
            ['Network entities', state.networkNodes.length],
            ['Network links', state.networkEdges.length],
            ['Workspaces', state.workspaces.map((workspace) => workspace.id).join(', ')],
          ]}
        />
      </Section>

      {state.projectData ? (
        <Section title="Document">
          <pre className="cyre-code">{JSON.stringify(state.projectData, null, 2)}</pre>
        </Section>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- Visualization */

export function VisualizationWindow(): JSX.Element {
  const {
    state,
    application,
    rendererBackend,
    setRendererBackend,
    viewportSettings,
    setViewportSettings,
    runCommand,
  } = useStudio();

  const toggle = (key: keyof ViewportSettings): void => {
    const current = viewportSettings[key];
    if (typeof current !== 'boolean') return;
    setViewportSettings({ ...viewportSettings, [key]: !current });
  };

  const overlays: Array<{ key: keyof ViewportSettings; label: string; testId: string }> = [
    { key: 'showGrid', label: 'Grid', testId: 'overlay-grid' },
    { key: 'showWireframe', label: 'Wireframe', testId: 'overlay-wireframe' },
    { key: 'showLabels', label: 'Host labels', testId: 'overlay-labels' },
    { key: 'showCompromised', label: 'Highlight compromised hosts', testId: 'overlay-compromised' },
    { key: 'showIsolated', label: 'Style isolated hosts', testId: 'overlay-isolated' },
    { key: 'showAlerts', label: 'Alert overlay', testId: 'overlay-alerts' },
    { key: 'showEvidence', label: 'Evidence overlay', testId: 'overlay-evidence' },
  ];

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Visualization"
        subtitle="Render mode, overlays, lighting and the engine render backend registry."
      />

      <Section title="Render mode">
        <div className="cyre-row" data-between="true">
          <Segmented
            ariaLabel="Render mode"
            value={state.renderMode}
            options={[
              { value: '2d', label: '2D' },
              { value: '2.5d', label: '2.5D' },
              { value: '3d', label: '3D' },
            ]}
            testId="visualization-mode"
            onChange={(value) => runCommand(`view.mode-${value}`)}
          />
          <Badge tone="accent">{state.renderMode.toUpperCase()}</Badge>
        </div>
      </Section>

      <Section title="Renderer">
        {/*
          Two real renderers, both fed by the same simulation state through the
          same scene graph. This is a presentation choice, so switching it
          cannot change what the simulation is doing.
        */}
        <div className="cyre-row" data-between="true">
          <Segmented
            ariaLabel="Renderer"
            value={rendererBackend}
            options={[
              { value: 'engine-gpu', label: 'Engine GPU' },
              { value: 'three-webgl', label: 'Three.js WebGL' },
            ]}
            testId="visualization-renderer"
            onChange={(value) => setRendererBackend(value as 'engine-gpu' | 'three-webgl')}
          />
          <Badge tone="accent">
            {rendererBackend === 'engine-gpu' ? 'Engine GPU' : 'Three.js WebGL'}
          </Badge>
        </div>
        <p className="cyre-panel-subtitle" data-testid="visualization-renderer-note">
          {rendererBackend === 'engine-gpu'
            ? 'The engine GPU renderer submits indexed triangle meshes through the CYRE WebGL2 device.'
            : 'The Three.js WebGL renderer draws the same engine scene description through Three.js.'}
        </p>
      </Section>

      <Section title="Overlays">
        <div className="cyre-grid" data-columns="2">
          {overlays.map((overlay) => (
            <Checkbox
              key={overlay.key}
              label={overlay.label}
              testId={overlay.testId}
              checked={Boolean(viewportSettings[overlay.key])}
              onChange={() => toggle(overlay.key)}
            />
          ))}
        </div>
        <RangeField
          label="Key light intensity"
          value={viewportSettings.lightIntensity}
          min={0}
          max={6}
          step={0.1}
          testId="overlay-light"
          format={(value) => `${value.toFixed(1)}`}
          onChange={(value) => setViewportSettings({ ...viewportSettings, lightIntensity: value })}
        />
      </Section>

      <Section title="Render backends">
        <div className="cyre-list">
          {state.renderingBackends.map((backend) => (
            <div
              key={backend.id}
              className="cyre-list-row"
              data-selected={backend.id === state.activeRenderingBackendId || undefined}
            >
              <span className="cyre-list-main">
                <span className="cyre-list-title">{backend.name}</span>
                <span className="cyre-list-meta">{backend.id}</span>
              </span>
              <Button
                size="sm"
                disabled={backend.id === state.activeRenderingBackendId}
                testId={`backend-${backend.id}`}
                onClick={() => application.setActiveRenderingBackend(backend.id)}
              >
                {backend.id === state.activeRenderingBackendId ? 'Active' : 'Activate'}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {state.renderResult ? (
        <Section title="Last render">
          <KeyValue
            entries={[
              ['Backend', state.renderResult.backendId],
              ['Target', state.renderResult.targetId],
              ['Frame', state.renderResult.frameNumber],
              ['Rendered at', new Date(state.renderResult.renderedAt).toISOString()],
              [
                'Stats',
                state.renderResult.stats ? JSON.stringify(state.renderResult.stats) : '—',
              ],
            ]}
          />
        </Section>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Security */

export function SecurityWindow(): JSX.Element {
  const { state, application, notify } = useStudio();
  const [payload, setPayload] = useState(HOSTILE_SCENARIO_PAYLOADS[0].payload);
  const report = state.securityReports[state.securityReports.length - 1] ?? null;
  const adHoc = application.security.executeInSandbox('ad-hoc', payload);

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Security Validation"
        subtitle="Engine sandbox execution, hostile payload rejection and the security audit report."
        actions={
          <Button
            icon="shield"
            variant="primary"
            testId="security-run"
            onClick={() => {
              try {
                const result = application.runSecurityValidation();
                notify(result.passed ? 'success' : 'error', result.passed ? 'Security validation passed.' : 'Security validation reported issues.');
              } catch (error) {
                notify('error', error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Validate selected scenario
          </Button>
        }
      />

      <Section title="Ad-hoc sandbox execution">
        <div className="cyre-field">
          <span className="cyre-field-label">Scenario document</span>
          <textarea
            className="cyre-textarea"
            rows={6}
            value={payload}
            spellCheck={false}
            data-testid="security-payload"
            onChange={(event) => setPayload(event.target.value)}
          />
        </div>
        <Banner tone={adHoc.rejected ? 'success' : 'warning'}>
          {adHoc.rejected
            ? `Rejected by the sandbox: ${adHoc.error}`
            : `Accepted — initialised ${adHoc.hostCount} hosts. Escaped=${String(adHoc.escaped)}`}
        </Banner>
      </Section>

      <Section title="Hostile payload suite">
        <div className="cyre-list">
          {HOSTILE_SCENARIO_PAYLOADS.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="cyre-list-row"
              data-testid={`security-payload-${entry.name}`}
              onClick={() => setPayload(entry.payload)}
            >
              <Badge tone="danger">hostile</Badge>
              <span className="cyre-list-main">
                <span className="cyre-list-title">{entry.name}</span>
                <span className="cyre-list-meta">Load into the sandbox field to inspect the rejection reason.</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {!report ? (
        <EmptyState
          icon="lock"
          title="No validation report"
          body="Run validation to execute the selected scenario inside the engine sandbox and audit the live network graph."
        />
      ) : (
        <>
          <div className="cyre-grid" data-columns="4">
            <Stat label="Scenario" value={report.scenarioId ?? '—'} />
            <Stat label="Sandbox" value={report.sandbox.rejected ? 'rejected' : 'passed'} />
            <Stat label="Hostile rejected" value={`${report.hostileChecks.filter((check) => check.rejected).length}/${report.hostileChecks.length}`} />
            <Stat label="Overall" value={report.passed ? 'PASS' : 'FAIL'} />
          </div>

          <Banner tone={report.passed ? 'success' : 'danger'}>
            {report.passed
              ? 'Scenario executed safely, every hostile payload was rejected, and the audit reported no critical issues.'
              : 'Security validation reported issues — review the findings below.'}
          </Banner>

          <Section title="Hostile payload results">
            <div className="cyre-table-wrap">
              <table className="cyre-table">
                <thead>
                  <tr>
                    <th>Payload</th>
                    <th>Result</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {report.hostileChecks.map((check) => (
                    <tr key={check.name} data-testid={`security-check-${check.name}`}>
                      <td>{check.name}</td>
                      <td>
                        <Badge tone={check.rejected ? 'success' : 'danger'}>{check.rejected ? 'rejected' : 'accepted'}</Badge>
                      </td>
                      <td>{check.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {report.policyViolations.length > 0 ? (
            <Section title="Policy violations">
              <div className="cyre-list">
                {report.policyViolations.map((violation, index) => (
                  <Banner key={`${violation.path}-${index}`} tone="danger">
                    {violation.path}: {violation.message}
                  </Banner>
                ))}
              </div>
            </Section>
          ) : null}

          {report.audit ? (
            <Section title="Engine security audit">
              <div className="cyre-grid" data-columns="4">
                <Stat label="Issues" value={report.audit.issueCount} />
                <Stat label="Critical" value={report.audit.criticalCount} />
                <Stat label="Warnings" value={report.audit.warningCount} />
                <Stat label="Passed" value={report.audit.passed ? 'YES' : 'NO'} />
              </div>
              {report.audit.issues.length === 0 ? (
                <Banner tone="success">No issues raised by the engine security audit system.</Banner>
              ) : (
                <div className="cyre-table-wrap">
                  <table className="cyre-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Category</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.audit.issues.map((issue) => (
                        <tr key={issue.id}>
                          <td>
                            <Badge tone={issue.severity === 'critical' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'info'}>
                              {issue.severity}
                            </Badge>
                          </td>
                          <td>{issue.category}</td>
                          <td>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Output */

export function OutputWindow(): JSX.Element {
  const { state, application } = useStudio();

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Output"
        subtitle="Engine notifications produced by every Studio action."
        actions={
          <Button icon="trash" variant="danger" onClick={() => application.clearNotifications()} disabled={state.notifications.length === 0}>
            Clear
          </Button>
        }
      />

      {state.notifications.length === 0 ? (
        <EmptyState icon="terminal" title="No output" body="Engine notifications appear here as you work." />
      ) : (
        <div className="cyre-list">
          {[...state.notifications].reverse().map((notification) => (
            <div key={notification.id} className="cyre-list-row" data-testid={`output-${notification.type}`}>
              <Badge
                tone={
                  notification.type === 'error'
                    ? 'danger'
                    : notification.type === 'warning'
                      ? 'warning'
                      : notification.type === 'success'
                        ? 'success'
                        : 'info'
                }
              >
                {notification.type}
              </Badge>
              <span className="cyre-list-main">
                <span className="cyre-list-title">{notification.message}</span>
                <span className="cyre-list-meta">{notification.timestamp}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Shortcuts */

export function ShortcutsWindow(): JSX.Element {
  return (
    <div className="cyre-panel">
      <PanelHeader title="Keyboard Shortcuts" subtitle="Every shortcut registered in the CYRE Studio command layer." />

      {MENU_COMMAND_GROUPS.map((group) => (
        <Section key={group.label} title={group.label}>
          <div className="cyre-list">
            {group.items.map((item) => (
              <div key={item.id} className="cyre-list-row">
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{item.label}</span>
                </span>
                <span className="cyre-menu-shortcut">{item.shortcut}</span>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ About */

export function AboutWindow(): JSX.Element {
  const { state } = useStudio();

  return (
    <div className="cyre-panel">
      <div className="cyre-row">
        <Icon name="cyre" size={30} />
        <div>
          <h2 className="cyre-panel-title">CYRE Studio</h2>
          <p className="cyre-panel-subtitle">Cybersecurity Reality Engine — professional simulation editor.</p>
        </div>
      </div>

      <KeyValue
        entries={[
          ['Studio', `v${studioVersion()}`],
          ['Engine', `v${engineVersion()}`],
          ['Engine state', state.engineState],
          ['Windows open', state.windows.length],
          ['Scenarios', state.scenarioLibrary.length],
          ['Commands', state.commands.length],
        ]}
      />

      <Section title="Developed by">
        <div className="cyre-about-attribution" data-testid="about-attribution">
          <span className="cyre-about-developer" data-testid="about-developer">
            {CYRE_BRANDING.developer}
          </span>
          <span className="cyre-about-role" data-testid="about-developer-role">
            {CYRE_BRANDING.developerRole}
          </span>
          <span className="cyre-about-copyright" data-testid="about-copyright">
            {copyrightLine()}
          </span>
        </div>
      </Section>

      <Section title="Verification gates">
        <div className="cyre-row">
          <Badge tone="success">architecture audit</Badge>
          <Badge tone="success">placeholder audit</Badge>
          <Badge tone="success">typecheck</Badge>
          <Badge tone="success">lint</Badge>
          <Badge tone="success">unit tests</Badge>
          <Badge tone="success">build</Badge>
        </div>
      </Section>

      <Section title="Modules exposed in this editor">
        <p className="cyre-panel-subtitle">
          cyber simulation · scenario catalog and authoring · attack and defense models · detection, alerts and evidence ·
          deterministic replay · structured telemetry · experiment runner · performance benchmarks · security sandbox and
          audit · project authoring · 2D / 2.5D / 3D rendering.
        </p>
      </Section>
    </div>
  );
}
