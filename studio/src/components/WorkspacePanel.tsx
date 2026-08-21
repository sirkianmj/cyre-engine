import { useStudio } from '../studio/StudioContext';
import type { StudioWorkspace } from '../studio/StudioApplication';

const workspaceInfo: Record<StudioWorkspace, { title: string; subtitle: string }> = {
  default: {
    title: 'CYRE Workspace',
    subtitle: 'Project development environment',
  },
  network: {
    title: 'Network Editor',
    subtitle: 'Design and inspect cyber infrastructure',
  },
  mission: {
    title: 'Mission Designer',
    subtitle: 'Author scenarios, objectives and outcomes',
  },
  investigation: {
    title: 'Investigation',
    subtitle: 'Analyze evidence and reconstruct incidents',
  },
};

export function WorkspacePanel() {
  const { state } = useStudio();
  const info = workspaceInfo[state.workspace];

  return (
    <section className="workspace">
      <div className="workspace-header">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>{info.title}</h1>
          <p>{info.subtitle}</p>
        </div>

        <div className="workspace-actions">
          <button className="subtle-button">Select Tool</button>
          <button className="subtle-button">Focus</button>
        </div>
      </div>

      <div className="workspace-canvas">
        {state.workspace === 'default' && <DefaultWorkspace />}
        {state.workspace === 'network' && <NetworkWorkspace />}
        {state.workspace === 'mission' && <MissionWorkspace />}
        {state.workspace === 'investigation' && <InvestigationWorkspace />}
      </div>
    </section>
  );
}

function DefaultWorkspace() {
  return (
    <div className="welcome-workspace">
      <div className="cyre-emblem">C</div>
      <div className="welcome-copy">
        <div className="eyebrow">CYRE ENGINE 1.0</div>
        <h2>Cybersecurity, as a simulation domain.</h2>
        <p>
          Build networks, author incidents, simulate attacks, investigate
          evidence and create playable cybersecurity experiences.
        </p>
      </div>

      <div className="quick-actions">
        <button>＋ Create Project</button>
        <button>▣ Open Project</button>
        <button>◇ Browse Samples</button>
      </div>
    </div>
  );
}

function NetworkWorkspace() {
  return (
    <div className="graph-placeholder">
      <div className="graph-grid" />
      <div className="graph-node node-internet">Internet</div>
      <div className="graph-node node-firewall">Firewall</div>
      <div className="graph-node node-router">Router</div>
      <div className="graph-node node-web">Web Server</div>
      <div className="graph-node node-db">Database</div>
      <div className="graph-node node-client">Client</div>
      <div className="graph-line line-1" />
      <div className="graph-line line-2" />
      <div className="graph-line line-3" />
      <div className="graph-line line-4" />
      <div className="graph-line line-5" />
      <div className="canvas-hint">
        NetworkGraphEditor connected · visual authoring layer coming next
      </div>
    </div>
  );
}

function MissionWorkspace() {
  return (
    <div className="mission-canvas">
      <div className="mission-card">
        <span className="mission-number">01</span>
        <div>
          <div className="eyebrow">MISSION</div>
          <h3>Initial Access Investigation</h3>
          <p>Trace suspicious activity from the first alert to the affected host.</p>
        </div>
      </div>

      <div className="mission-flow">
        <span>Alert</span>
        <b>→</b>
        <span>Evidence</span>
        <b>→</b>
        <span>Hypothesis</span>
        <b>→</b>
        <span>Response</span>
      </div>
    </div>
  );
}

function InvestigationWorkspace() {
  return (
    <div className="investigation-canvas">
      <div className="investigation-header">
        <span className="severity critical">CRITICAL</span>
        <div>
          <h3>Suspicious lateral movement detected</h3>
          <p>INC-0001 · Active investigation</p>
        </div>
      </div>

      <div className="investigation-grid">
        <div>
          <span className="metric-label">EVIDENCE</span>
          <strong>24</strong>
        </div>
        <div>
          <span className="metric-label">AFFECTED HOSTS</span>
          <strong>4</strong>
        </div>
        <div>
          <span className="metric-label">ALERTS</span>
          <strong>7</strong>
        </div>
        <div>
          <span className="metric-label">CONFIDENCE</span>
          <strong>78%</strong>
        </div>
      </div>
    </div>
  );
}
