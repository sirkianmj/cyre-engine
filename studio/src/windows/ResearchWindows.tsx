/**
 * ResearchWindows
 * ----------------
 * Telemetry inspection and export, deterministic replay playback, the
 * multi-seed experiment runner, and the engine performance benchmarks.
 */

import { useState } from 'react';

import { createExperimentDefinition } from '../studio/services/ExperimentService';
import { TELEMETRY_EXPORT_FORMATS } from '../studio/services/TelemetryService';
import { useStudio } from '../studio/StudioContext';
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  KeyValue,
  PanelHeader,
  Progress,
  Section,
  Segmented,
  SelectField,
  Stat,
  TextField,
} from '../ui/primitives';

/* ------------------------------------------------------------- Telemetry */

export function TelemetryWindow(): JSX.Element {
  const { state, application, runCommand, notify } = useStudio();
  const events = state.telemetryEvents;
  const [format, setFormat] = useState<'json' | 'csv' | 'ndjson'>('json');

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Telemetry"
        subtitle="Structured events recorded by the engine telemetry recorder during this session."
        actions={
          <>
            <Segmented
              ariaLabel="Export format"
              value={format}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
                { value: 'ndjson', label: 'NDJSON' },
              ]}
              testId="telemetry-format"
              onChange={setFormat}
            />
            <Button
              icon="download"
              testId="telemetry-export"
              disabled={events.length === 0}
              onClick={() => runCommand(`research.export-${format}`)}
            >
              Export
            </Button>
            <Button icon="trash" variant="danger" onClick={() => application.telemetry.clear()} disabled={events.length === 0}>
              Clear
            </Button>
          </>
        }
      />

      <div className="cyre-grid" data-columns="3">
        <Stat label="Events" value={events.length} />
        <Stat label="Session" value={state.telemetrySessionId} />
        <Stat label="Formats" value={TELEMETRY_EXPORT_FORMATS.length} />
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No telemetry recorded"
          body="Execute simulation actions — every engine action is recorded with timing, seed and outcome."
          action={<Button variant="primary" icon="play" onClick={() => application.play()}>Play simulation</Button>}
        />
      ) : (
        <div className="cyre-table-wrap">
          <table className="cyre-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>ms</th>
                <th>t</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((event, index) => (
                <tr key={event.id} data-testid={`telemetry-row-${index}`}>
                  <td data-mono="true">{event.id}</td>
                  <td>{event.type}</td>
                  <td>{event.targetId ?? '—'}</td>
                  <td>
                    <Badge tone={event.success ? 'success' : 'danger'}>{event.success ? 'ok' : 'failed'}</Badge>
                  </td>
                  <td data-mono="true">{event.responseTimeMs ?? '—'}</td>
                  <td data-mono="true">{event.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Section title="Session">
        <div className="cyre-row">
          <TextField
            label="New session id"
            value={state.telemetrySessionId}
            onChange={(value) => {
              try {
                application.telemetry.startSession(value);
              } catch (error) {
                notify('error', error instanceof Error ? error.message : String(error));
              }
            }}
            testId="telemetry-session"
            hint="Starting a new session clears the current event log."
          />
        </div>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- Replay */

export function ReplayWindow(): JSX.Element {
  const { state, application, runCommand } = useStudio();
  const playback = state.replayPlayback;
  const replay = playback.replay;
  const sessionReplay = state.cyberSimulationReplay;

  const total = replay?.actions.length ?? 0;
  const progress = total === 0 ? 0 : (playback.index / total) * 100;

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Replay Studio"
        subtitle="Deterministic replay of the canonical simulation: record, save, load and step frame by frame."
        actions={
          <>
            <Button icon="replay" testId="replay-record" onClick={() => runCommand('replay.record')}>Record</Button>
            <Button icon="download" onClick={() => runCommand('replay.save')} disabled={!sessionReplay}>Save JSON</Button>
            <Button icon="upload" onClick={() => runCommand('replay.load')}>Load JSON</Button>
          </>
        }
      />

      <div className="cyre-grid" data-columns="4">
        <Stat label="Session actions" value={sessionReplay?.actions.length ?? 0} />
        <Stat label="Session seed" value={sessionReplay?.seed ?? '—'} />
        <Stat label="Open replay" value={replay ? `${playback.index}/${total}` : 'none'} />
        <Stat label="Playing" value={playback.playing ? 'yes' : 'no'} />
      </div>

      {!replay ? (
        <EmptyState
          icon="replay"
          title="No replay open"
          body="Record the current session or load a replay document to step through it deterministically."
          action={
            <div className="cyre-row">
              <Button variant="primary" onClick={() => runCommand('replay.record')} disabled={!sessionReplay}>
                Record current session
              </Button>
              <Button onClick={() => runCommand('replay.load')}>Load JSON…</Button>
            </div>
          }
        />
      ) : (
        <>
          <Section title="Transport">
            <div className="cyre-row">
              <Button icon="step-back" onClick={() => runCommand('replay.to-start')}>Start</Button>
              <Button icon="step-back" onClick={() => runCommand('replay.step-back')} testId="replay-back">Back</Button>
              <Button
                icon={playback.playing ? 'pause' : 'play'}
                variant="primary"
                testId="replay-play"
                onClick={() => runCommand(playback.playing ? 'replay.pause' : 'replay.play')}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </Button>
              <Button icon="step-forward" onClick={() => runCommand('replay.step-forward')} testId="replay-forward">Forward</Button>
              <Button icon="step-forward" onClick={() => runCommand('replay.to-end')}>End</Button>
              <Button icon="x" variant="danger" onClick={() => runCommand('replay.stop')}>Close</Button>
            </div>
            <Progress value={progress} />
          </Section>

          <Section title="Action log">
            <div className="cyre-list">
              {replay.actions.map((action, index) => (
                <button
                  key={`${action.method}-${index}`}
                  type="button"
                  className="cyre-list-row"
                  data-selected={index < playback.index || undefined}
                  data-testid={`replay-action-${index}`}
                  onClick={() => application.seekReplayPlayback(index + 1)}
                >
                  <Badge tone={index < playback.index ? 'success' : 'neutral'}>{index + 1}</Badge>
                  <span className="cyre-list-main">
                    <span className="cyre-list-title">{action.method}</span>
                    <span className="cyre-list-meta">{action.args ? JSON.stringify(action.args) : 'no arguments'}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="State at current frame">
            {playback.state ? (
              <KeyValue
                entries={[
                  ['Attacker', playback.state.attacker.position],
                  ['Privileges', playback.state.attacker.privileges],
                  ['Stage', playback.state.attackStage],
                  ['Compromised', Object.values(playback.state.hosts).filter((host) => host.compromised).length],
                  ['Isolated', Object.values(playback.state.hosts).filter((host) => host.isolated).length],
                  ['Alerts', playback.state.alerts.length],
                  ['Evidence', playback.state.evidence.length],
                  ['Objective', playback.state.objective.achieved ? 'achieved' : 'open'],
                ]}
              />
            ) : (
              <Banner tone="info">Frame 0 — the simulation has not executed any action yet.</Banner>
            )}
          </Section>
        </>
      )}

      <Section title="Event bookmarks">
        {state.replayBookmarks.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No bookmarks"
            body="Bookmark positions in the engine replay studio timeline."
            action={<Button onClick={() => runCommand('replay.bookmark')}>Bookmark current event</Button>}
          />
        ) : (
          <div className="cyre-list">
            {state.replayBookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                type="button"
                className="cyre-list-row"
                onClick={() => application.gotoReplayBookmark(bookmark.id)}
              >
                <Badge tone="accent">{bookmark.index}</Badge>
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{bookmark.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------- Research */

export function ResearchWindow(): JSX.Element {
  const { state, application, notify, runCommand } = useStudio();
  const [name, setName] = useState('Studio seeded experiment');
  const [seedStart, setSeedStart] = useState('1');
  const [runCount, setRunCount] = useState('5');
  const [format, setFormat] = useState<'json' | 'csv' | 'ndjson'>('json');
  const latest = state.experiments[state.experiments.length - 1] ?? null;

  const runExperiment = (): void => {
    try {
      const stored = application.experiments.run(
        createExperimentDefinition({
          id: `experiment-${Date.now().toString(36)}`,
          name,
          description: 'Seeded deterministic attack chain executed through the engine replay system.',
          scenarioId: state.cyberSession.scenarioId,
          seedStart: Number(seedStart) || 0,
          runCount: Number(runCount) || 1,
        }),
      );
      notify(
        'success',
        `Ran ${stored.comparison.runCount} seeds · ${stored.comparison.successCount} succeeded · deterministic=${stored.comparison.deterministic}`,
      );
    } catch (error) {
      notify('error', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Experiment Runner"
        subtitle="Reproducible multi-seed experiments through the engine's CyberSimulationExperimentRunner."
        actions={
          <Button icon="flask" variant="primary" testId="experiment-run" onClick={runExperiment}>
            Run experiment
          </Button>
        }
      />

      <div className="cyre-grid" data-columns="3">
        <TextField label="Experiment name" value={name} onChange={setName} testId="experiment-name" />
        <TextField label="Seed start" type="number" min={0} value={seedStart} onChange={setSeedStart} testId="experiment-seed-start" />
        <TextField label="Run count" type="number" min={1} value={runCount} onChange={setRunCount} testId="experiment-count" />
      </div>

      {latest ? (
        <>
          <div className="cyre-grid" data-columns="4">
            <Stat label="Runs" value={latest.comparison.runCount} />
            <Stat label="Succeeded" value={latest.comparison.successCount} />
            <Stat label="Objective met" value={latest.comparison.objectiveAchievedCount} />
            <Stat label="Deterministic" value={latest.comparison.deterministic ? 'YES' : 'NO'} />
          </div>

          <Banner tone={latest.comparison.deterministic ? 'success' : 'warning'}>
            {latest.comparison.deterministic
              ? `All ${latest.comparison.successCount} successful runs reached an identical final state.`
              : `Runs diverged across ${latest.comparison.uniqueFinalStates} distinct final states.`}
          </Banner>

          <Section
            title="Run comparison"
            actions={
              <>
                <Segmented
                  ariaLabel="Export format"
                  value={format}
                  options={[
                    { value: 'json', label: 'JSON' },
                    { value: 'csv', label: 'CSV' },
                    { value: 'ndjson', label: 'NDJSON' },
                  ]}
                  testId="experiment-format"
                  onChange={setFormat}
                />
                <Button
                  icon="download"
                  testId="experiment-export"
                  onClick={() => {
                    try {
                      const content = application.experiments.export(format, latest);
                      const extension = format === 'ndjson' ? 'ndjson' : format;
                      downloadDocument(`${latest.definition.id}.${extension}`, content);
                      notify('success', `Exported experiment data as ${format.toUpperCase()}.`);
                    } catch (error) {
                      notify('error', error instanceof Error ? error.message : String(error));
                    }
                  }}
                >
                  Export data
                </Button>
              </>
            }
          >
            <div className="cyre-table-wrap">
              <table className="cyre-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Seed</th>
                    <th>Ok</th>
                    <th>Position</th>
                    <th>Priv</th>
                    <th>Stage</th>
                    <th>Compr.</th>
                    <th>Alerts</th>
                    <th>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.comparison.runs.map((run) => (
                    <tr key={run.participantId} data-testid={`experiment-run-${run.seed}`}>
                      <td>{run.participantId}</td>
                      <td data-mono="true">{run.seed}</td>
                      <td>
                        <Badge tone={run.success ? 'success' : 'danger'}>{run.success ? 'ok' : 'fail'}</Badge>
                      </td>
                      <td>{run.attackerPosition}</td>
                      <td>{run.attackerPrivileges}</td>
                      <td>{run.attackStage}</td>
                      <td data-mono="true">{run.compromisedHosts}</td>
                      <td data-mono="true">{run.alertCount}</td>
                      <td data-mono="true">{run.eventCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      ) : (
        <EmptyState
          icon="flask"
          title="No experiments yet"
          body="Run an experiment to execute the canonical attack chain across a range of deterministic seeds and compare the outcomes."
          action={<Button variant="primary" onClick={() => runCommand('research.run')}>Run default experiment</Button>}
        />
      )}

      {state.experiments.length > 0 ? (
        <ResearchAnalyticsPanel />
      ) : null}

      {state.experiments.length > 1 ? (
        <Section title="Previous experiments">
          <div className="cyre-list">
            {[...state.experiments].reverse().slice(1).map((entry) => (
              <div key={entry.definition.id} className="cyre-list-row">
                <span className="cyre-list-main">
                  <span className="cyre-list-title">{entry.definition.name}</span>
                  <span className="cyre-list-meta">
                    {entry.definition.id} · {entry.comparison.runCount} runs · deterministic={String(entry.comparison.deterministic)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function downloadDocument(filename: string, content: string): void {
  try {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Downloads can be blocked; the notification trail still records the run.
  }
}

/* ----------------------------------------------------------- Performance */

export function PerformanceWindow(): JSX.Element {
  const { state, application, notify } = useStudio();
  const [iterations, setIterations] = useState('200');
  const [hostCount, setHostCount] = useState('1000');
  const reports = state.benchmarks;

  return (
    <div className="cyre-panel">
      <PanelHeader
        title="Performance"
        subtitle="Engine benchmarks executed in-process against the real simulation runtime."
        actions={
          <Button icon="trash" variant="danger" onClick={() => application.benchmarks.clear()} disabled={reports.length === 0}>
            Clear
          </Button>
        }
      />

      <div className="cyre-grid" data-columns="2">
        <div className="cyre-card">
          <TextField
            label="Seeded simulations"
            type="number"
            min={1}
            value={iterations}
            onChange={setIterations}
            testId="benchmark-iterations"
            hint="Full attack chain per simulation."
          />
          <Button
            icon="gauge"
            variant="primary"
            testId="benchmark-run"
            onClick={() => {
              try {
                const report = application.benchmarks.runSimulationBenchmark(Number(iterations) || 1);
                notify('success', `${report.simulation?.iterations} simulations in ${report.simulation?.durationMs.toFixed(1)} ms.`);
              } catch (error) {
                notify('error', error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Run benchmark
          </Button>
        </div>

        <div className="cyre-card">
          <TextField
            label="Hosts"
            type="number"
            min={1}
            value={hostCount}
            onChange={setHostCount}
            testId="benchmark-hosts"
            hint="Synthetic network initialisation."
          />
          <Button
            icon="server"
            testId="benchmark-large"
            onClick={() => {
              try {
                const report = application.benchmarks.runLargeNetworkBenchmark(Number(hostCount) || 1);
                notify('success', `${report.largeNetwork?.hostCount} hosts in ${report.largeNetwork?.durationMs.toFixed(1)} ms.`);
              } catch (error) {
                notify('error', error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Run large-network benchmark
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon="gauge" title="No benchmark reports" body="Run a benchmark to measure simulation throughput." />
      ) : (
        <Section title="Reports">
          <div className="cyre-table-wrap">
            <table className="cyre-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Kind</th>
                  <th>Duration</th>
                  <th>Throughput</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...reports].reverse().map((report) => (
                  <tr key={report.id} data-testid={`benchmark-row-${report.id}`}>
                    <td>{report.label}</td>
                    <td>{report.kind}</td>
                    <td data-mono="true">
                      {(report.simulation?.durationMs ?? report.largeNetwork?.durationMs ?? 0).toFixed(2)} ms
                    </td>
                    <td data-mono="true">
                      {report.simulation ? `${report.simulation.operationsPerSecond} ops/s` : '—'}
                    </td>
                    <td>
                      <Badge tone={report.simulation?.completed ?? report.largeNetwork?.initialized ? 'success' : 'danger'}>
                        {report.simulation?.completed ?? report.largeNetwork?.initialized ? 'ok' : 'failed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}


/**
 * Real analytics over the stored experiments: descriptive statistics per
 * condition, distribution shape, and effect sizes against a baseline arm.
 */
function ResearchAnalyticsPanel(): JSX.Element {
  const { application, notify } = useStudio();
  const [baselineId, setBaselineId] = useState('');
  const [format, setFormat] = useState<'json' | 'csv' | 'ndjson' | 'comparisons-csv'>('json');

  const experiments = application.experiments.list();
  const effectiveBaseline = baselineId || experiments[0]?.definition.id || '';
  const report = application.experiments.buildAnalytics({ baselineId: effectiveBaseline });

  const conditionOptions = experiments.map((entry) => ({
    value: entry.definition.id,
    label: entry.definition.name,
  }));

  return (
    <Section
      title="Analytics"
      actions={
        <>
          <Segmented
            ariaLabel="Analytics export format"
            value={format}
            options={[
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
              { value: 'ndjson', label: 'NDJSON' },
              { value: 'comparisons-csv', label: 'Comparisons' },
            ]}
            testId="analytics-format"
            onChange={setFormat}
          />
          <Button
            icon="download"
            testId="analytics-export"
            onClick={() => {
              try {
                const content = application.experiments.exportAnalytics(format, {
                  baselineId: effectiveBaseline,
                });
                const extension = format === 'comparisons-csv' ? 'csv' : format;
                downloadDocument(`${report.metrics.length ? 'cyre-analytics' : 'cyre-analytics'}.${extension}`, content);
                notify('success', `Exported analytics as ${format}.`);
              } catch (error) {
                notify('error', error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Export
          </Button>
        </>
      }
    >
      <SelectField
        label="Baseline condition"
        value={effectiveBaseline}
        options={conditionOptions}
        testId="analytics-baseline"
        onChange={setBaselineId}
        hint="Effect sizes are computed for every other condition against this one."
      />

      <div className="cyre-grid" data-columns="4">
        <Stat label="Runs analysed" value={report.runCount} />
        <Stat label="Conditions" value={report.conditionCount} />
        <Stat label="Metrics" value={report.metrics.length} />
        <Stat label="Comparisons" value={report.comparisons.length} />
      </div>

      {report.conditions.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No successful runs to analyse"
          body="Analytics are computed from successful experiment runs only."
        />
      ) : (
        <>
          <div className="cyre-table-wrap">
            <table className="cyre-table">
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Metric</th>
                  <th>n</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>SD</th>
                  <th>IQR</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {report.conditions.flatMap((condition) =>
                  report.metrics.map((metric) => {
                    const stats = condition.statistics[metric];
                    if (!stats) return null;
                    return (
                      <tr key={`${condition.conditionId}-${metric}`} data-testid={`analytics-${condition.conditionId}-${metric}`}>
                        <td>{condition.label}</td>
                        <td>{metric}</td>
                        <td data-mono="true">{stats.count}</td>
                        <td data-mono="true">{stats.mean.toFixed(3)}</td>
                        <td data-mono="true">{stats.median.toFixed(3)}</td>
                        <td data-mono="true">{stats.standardDeviation.toFixed(3)}</td>
                        <td data-mono="true">{stats.interquartileRange.toFixed(3)}</td>
                        <td data-mono="true">{stats.min.toFixed(3)}</td>
                        <td data-mono="true">{stats.max.toFixed(3)}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>

          {report.comparisons.length > 0 ? (
            <div className="cyre-table-wrap">
              <table className="cyre-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Condition</th>
                    <th>Δ mean</th>
                    <th>Relative</th>
                    <th>Cohen&apos;s d</th>
                    <th>Hedges&apos; g</th>
                    <th>Welch t</th>
                    <th>df</th>
                    <th>Magnitude</th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparisons.map((comparison) => (
                    <tr
                      key={`${comparison.metric}-${comparison.comparisonId}`}
                      data-testid={`analytics-comparison-${comparison.metric}-${comparison.comparisonId}`}
                    >
                      <td>{comparison.metric}</td>
                      <td>{comparison.comparisonId}</td>
                      <td data-mono="true">{comparison.meanDifference.toFixed(3)}</td>
                      <td data-mono="true">
                        {comparison.relativeChange === null ? '—' : `${(comparison.relativeChange * 100).toFixed(1)}%`}
                      </td>
                      <td data-mono="true">{comparison.cohensD === null ? '—' : comparison.cohensD.toFixed(3)}</td>
                      <td data-mono="true">{comparison.hedgesG === null ? '—' : comparison.hedgesG.toFixed(3)}</td>
                      <td data-mono="true">{comparison.welchT === null ? '—' : comparison.welchT.toFixed(3)}</td>
                      <td data-mono="true">
                        {comparison.degreesOfFreedom === null ? '—' : comparison.degreesOfFreedom.toFixed(2)}
                      </td>
                      <td>
                        <Badge
                          tone={
                            comparison.effectMagnitude === 'large'
                              ? 'success'
                              : comparison.effectMagnitude === 'negligible'
                                ? 'neutral'
                                : 'info'
                          }
                        >
                          {comparison.effectMagnitude}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Banner tone="info">
              Run at least two experiment conditions to compute effect sizes between them.
            </Banner>
          )}
        </>
      )}
    </Section>
  );
}
