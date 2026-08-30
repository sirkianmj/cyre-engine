/**
 * ScenarioWindows
 * ----------------
 * Scenario library browsing/selection and the cyber scenario authoring
 * editor. Validation, sandbox execution, import and export all run through
 * the engine's scenario services.
 */

import { useState } from 'react';

import type { CyberScenarioDefinition } from '@cyre/engine';

import { CYBER_SCENARIO_NODE_TYPES } from '../studio/services/ScenarioLibraryService';
import { createScenarioDraft } from '../studio/StudioDocument';
import { useStudio } from '../studio/StudioContext';
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  KeyValue,
  PanelHeader,
  Section,
  SelectField,
  TextAreaField,
  TextField,
} from '../ui/primitives';

/* ----------------------------------------------------- Scenario Library */

export function ScenarioLibraryWindow(): JSX.Element {
  const { state, application, runCommand, notify } = useStudio();
  const [query, setQuery] = useState('');
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [newId, setNewId] = useState('');

  const library = state.scenarioLibrary.filter(
    (scenario) =>
      query.trim() === '' ||
      scenario.name.toLowerCase().includes(query.toLowerCase()) ||
      scenario.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Scenario Library"
        subtitle="Engine catalog plus scenarios you have authored or imported."
        actions={
          <>
            <Button icon="upload" onClick={() => runCommand('scenario.import')}>Import JSON…</Button>
            <Button icon="download" onClick={() => runCommand('scenario.export')}>Export selected</Button>
          </>
        }
      />

      <Field label="Filter">
        <input
          className="cyre-input"
          value={query}
          placeholder="Search scenarios…"
          data-testid="scenario-filter"
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>

      {library.length === 0 ? (
        <EmptyState
          icon="library"
          title="No matching scenarios"
          body="Adjust the filter, import a scenario document, or author a new one in the scenario editor."
        />
      ) : (
        <div className="cyre-list">
          {library.map((scenario) => {
            const selected = scenario.id === state.selectedCyberScenarioId;

            return (
              <div key={scenario.id} className="cyre-list-row" data-selected={selected || undefined} data-testid={`scenario-row-${scenario.id}`}>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">
                    {scenario.name} <Badge tone={scenario.origin === 'catalog' ? 'info' : 'accent'}>{scenario.origin}</Badge>
                  </span>
                  <span className="cyre-list-meta">
                    {scenario.description} · {scenario.nodeCount} nodes · target {scenario.targetHostId} · seed {scenario.seed}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={selected ? 'default' : 'primary'}
                  disabled={selected}
                  testId={`scenario-select-${scenario.id}`}
                  onClick={() => application.selectCyberScenario(scenario.id)}
                >
                  {selected ? 'Selected' : 'Select'}
                </Button>
                <Button size="sm" icon="play" testId={`scenario-run-${scenario.id}`} onClick={() => runCommand('scenario.run')}>
                  Run
                </Button>
                <Button
                  size="sm"
                  icon="edit"
                  testId={`scenario-duplicate-${scenario.id}`}
                  onClick={() => {
                    setDuplicateId(scenario.id);
                    setNewId(`${scenario.id}-copy`);
                  }}
                >
                  Duplicate
                </Button>
                {scenario.origin === 'custom' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="trash"
                    testId={`scenario-delete-${scenario.id}`}
                    onClick={() => application.removeCustomCyberScenario(scenario.id)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {duplicateId ? (
        <div className="cyre-card" data-selected="true">
          <span className="cyre-section-title">Duplicate "{duplicateId}"</span>
          <TextField label="New scenario id" value={newId} onChange={setNewId} testId="scenario-duplicate-id" />
          <div className="cyre-row">
            <Button
              variant="primary"
              testId="scenario-duplicate-confirm"
              onClick={() => {
                try {
                  const source = application.scenarios.get(duplicateId);
                  if (!source) throw new Error(`Scenario "${duplicateId}" is not available.`);
                  const copy = application.scenarios.duplicate(duplicateId, newId, `${source.name} (copy)`);
                  application.selectCyberScenario(copy.id);
                  notify('success', `Duplicated as "${copy.id}".`);
                  setDuplicateId(null);
                } catch (error) {
                  notify('error', error instanceof Error ? error.message : String(error));
                }
              }}
            >
              Create copy
            </Button>
            <Button onClick={() => setDuplicateId(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      <Section title="Active scenario">
        <KeyValue
          entries={[
            ['Scenario', state.cyberSession.scenarioName],
            ['Seed', state.cyberSession.seed],
            ['Source', state.cyberSession.scenarioSource],
            ['Custom override', state.hasCustomCyberScenario ? 'yes' : 'no'],
          ]}
        />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------ Scenario Editor */

const EMPTY_NODE = { id: '', name: '', type: 'web_server' as const };

export function ScenarioEditorWindow(): JSX.Element {
  const { state, application, notify, runCommand } = useStudio();
  const draft = state.scenarioDraft;
  const report = state.scenarioValidation;
  const [nodeDraft, setNodeDraft] = useState({ ...EMPTY_NODE });

  if (!draft) {
    return (
      <div className="cyre-panel">
        <PanelHeader title="Scenario Editor" subtitle="Author a cyber scenario definition and validate it before running." />
        <EmptyState
          icon="edit"
          title="No scenario draft open"
          body="Create a new draft or load the currently selected scenario into the editor."
          action={
            <div className="cyre-row">
              <Button variant="primary" onClick={() => runCommand('edit.new-scenario-draft')}>New draft</Button>
              <Button onClick={() => loadSelected()}>Load selected scenario</Button>
            </div>
          }
        />
      </div>
    );
  }

  function loadSelected(): void {
    const scenario = application.getSelectedScenario();
    if (!scenario) {
      notify('warning', 'No scenario is selected.');
      return;
    }
    application.setScenarioDraft(scenario, `Load ${scenario.id}`);
  }

  const update = (patch: Partial<CyberScenarioDefinition>, label: string): void => {
    application.setScenarioDraft({ ...draft, ...patch }, label);
  };

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Scenario Editor"
        subtitle="Edits are undoable (⌘Z) and validated against the engine sandbox before saving."
        actions={
          <>
            <Button icon="check" testId="scenario-validate" onClick={() => runCommand('edit.validate-scenario')}>Validate</Button>
            <Button variant="primary" icon="download" testId="scenario-commit" onClick={() => runCommand('scenario.save')}>
              Save to library
            </Button>
          </>
        }
      />

      <div className="cyre-grid" data-columns="2">
        <TextField label="Id" value={draft.id} onChange={(value) => update({ id: value }, 'Edit scenario id')} testId="scenario-id" />
        <TextField label="Name" value={draft.name} onChange={(value) => update({ name: value }, 'Edit scenario name')} testId="scenario-name" />
      </div>

      <TextAreaField
        label="Description"
        value={draft.description}
        rows={2}
        spellCheck
        onChange={(value) => update({ description: value }, 'Edit scenario description')}
        testId="scenario-description"
      />

      <div className="cyre-grid" data-columns="3">
        <TextField
          label="Seed"
          type="number"
          min={0}
          value={String(draft.seed)}
          onChange={(value) => update({ seed: Number(value) || 0 }, 'Edit scenario seed')}
          testId="scenario-seed"
        />
        <SelectField
          label="Target host"
          value={draft.targetHostId}
          options={draft.nodes.map((node) => ({ value: node.id, label: `${node.name} (${node.id})` }))}
          onChange={(value) => update({ targetHostId: value }, 'Edit scenario target')}
          testId="scenario-target"
        />
        <Field label="Nodes">
          <input className="cyre-input" value={`${draft.nodes.length} nodes · ${draft.connectionLogs.length} logs`} readOnly disabled />
        </Field>
      </div>

      <Section title="Nodes">
        <div className="cyre-list">
          {draft.nodes.map((node, index) => (
            <div key={`${node.id}-${index}`} className="cyre-list-row" data-testid={`scenario-node-${node.id}`}>
              <span className="cyre-list-main">
                <span className="cyre-list-title">{node.name || node.id}</span>
                <span className="cyre-list-meta">
                  {node.id} · {node.type} · {node.services?.length ?? 0} services
                  {node.vulnerabilities?.length ? ` · ${node.vulnerabilities.join(', ')}` : ''}
                </span>
              </span>
              <Button
                size="sm"
                variant="danger"
                icon="trash"
                testId={`scenario-node-remove-${node.id}`}
                onClick={() =>
                  update(
                    {
                      nodes: draft.nodes.filter((_, entryIndex) => entryIndex !== index),
                      connectionLogs: draft.connectionLogs.filter(
                        (log) => log.source !== node.id && log.target !== node.id,
                      ),
                    },
                    `Remove node ${node.id}`,
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="cyre-card">
          <span className="cyre-section-title">Add node</span>
          <div className="cyre-grid" data-columns="3">
            <TextField label="Id" value={nodeDraft.id} onChange={(value) => setNodeDraft({ ...nodeDraft, id: value })} testId="scenario-new-node-id" />
            <TextField label="Name" value={nodeDraft.name} onChange={(value) => setNodeDraft({ ...nodeDraft, name: value })} testId="scenario-new-node-name" />
            <SelectField
              label="Type"
              value={nodeDraft.type}
              options={CYBER_SCENARIO_NODE_TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(value) => setNodeDraft({ ...nodeDraft, type: value as typeof nodeDraft.type })}
              testId="scenario-new-node-type"
            />
          </div>
          <Button
            icon="plus"
            testId="scenario-node-add"
            disabled={!nodeDraft.id.trim() || draft.nodes.some((node) => node.id === nodeDraft.id.trim())}
            onClick={() => {
              update(
                {
                  nodes: [
                    ...draft.nodes,
                    {
                      id: nodeDraft.id.trim(),
                      name: nodeDraft.name.trim() || nodeDraft.id.trim(),
                      type: nodeDraft.type,
                    },
                  ],
                },
                `Add node ${nodeDraft.id}`,
              );
              setNodeDraft({ ...EMPTY_NODE });
            }}
          >
            Add node
          </Button>
        </div>
      </Section>

      <Section title="Connection logs">
        {draft.connectionLogs.length === 0 ? (
          <span className="cyre-list-meta">No connection logs. Add nodes and let the attacker generate telemetry during the run.</span>
        ) : (
          <div className="cyre-list">
            {draft.connectionLogs.map((log, index) => (
              <div key={`${log.type}-${index}`} className="cyre-list-row">
                <Badge tone="info">{log.type}</Badge>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">
                    {log.source}
                    {log.target ? ` → ${log.target}` : ''}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  icon="trash"
                  onClick={() =>
                    update(
                      { connectionLogs: draft.connectionLogs.filter((_, entryIndex) => entryIndex !== index) },
                      'Remove connection log',
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Validation">
        {!report ? (
          <Banner tone="info">Run validation to check the draft against the engine sandbox.</Banner>
        ) : report.issues.length === 0 && report.sandboxPassed ? (
          <Banner tone="success">
            Scenario is valid and initialises {report.hostCount} hosts inside the engine sandbox.
          </Banner>
        ) : (
          <div className="cyre-list">
            {!report.sandboxPassed ? <Banner tone="danger">Sandbox execution failed: {report.sandboxError}</Banner> : null}
            {report.issues.map((issue, index) => (
              <Banner key={`${issue.path}-${index}`} tone={issue.severity === 'error' ? 'danger' : 'warning'}>
                {issue.path}: {issue.message}
              </Banner>
            ))}
          </div>
        )}
      </Section>

      <Section title="Document">
        <pre className="cyre-code">{JSON.stringify(draft, null, 2)}</pre>
      </Section>
    </div>
  );
}

/** Convenience export used by the window registry for the empty-state action. */
export function defaultScenarioDraft(): CyberScenarioDefinition {
  return createScenarioDraft();
}
