import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function ScenarioDesignerPanel(): JSX.Element {
  const {
    state,
    createScenario,
    addScenarioNetworkNode,
    addScenarioAsset,
    addScenarioObjective,
    buildScenario,
  } = useStudio();

  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState('server');
  const [nodeName, setNodeName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('server');
  const [assetValue, setAssetValue] = useState(50);
  const [objective, setObjective] = useState('');

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scenario name" />
        <button onClick={() => createScenario(name)}>Create Scenario</button>
      </div>

      <div className="authoring-grid">
        <div className="authoring-card">
          <h4>Network</h4>
          <input value={nodeName} onChange={(e) => setNodeName(e.target.value)} placeholder="Node name" />
          <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
            <option value="server">Server</option>
            <option value="client">Client</option>
            <option value="router">Router</option>
            <option value="firewall">Firewall</option>
          </select>
          <button onClick={() => addScenarioNetworkNode(nodeType, nodeName || undefined)}>Add Node</button>
        </div>

        <div className="authoring-card">
          <h4>Assets</h4>
          <input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name" />
          <input value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="Asset type" />
          <input type="number" value={assetValue} onChange={(e) => setAssetValue(Number(e.target.value))} />
          <button onClick={() => addScenarioAsset(assetName, assetType, assetValue)}>Add Asset</button>
        </div>

        <div className="authoring-card">
          <h4>Objectives</h4>
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objective description" />
          <button onClick={() => addScenarioObjective(objective)}>Add Objective</button>
        </div>
      </div>

      <button className="btn btn-primary" onClick={buildScenario}>Validate & Build Scenario</button>

      {state.currentScenarioData && (
        <pre className="authoring-preview">
          {JSON.stringify(state.currentScenarioData, null, 2).slice(0, 1400)}
        </pre>
      )}
    </div>
  );
}

export function MissionDesignerPanel(): JSX.Element {
  const {
    state,
    createMissionDesign,
    addMissionObjective,
    buildMissionDesign,
  } = useStudio();

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mission name" />
        <button onClick={() => createMissionDesign(name)}>New Mission</button>
      </div>

      <div className="authoring-card">
        <h4>Objectives</h4>
        <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objective description" />
        <button onClick={() => addMissionObjective(objective, 'primary')}>Add Objective</button>
      </div>

      <button className="btn btn-primary" onClick={buildMissionDesign}>Validate Mission</button>

      <pre className="authoring-preview">
        {JSON.stringify(state.missionDesign, null, 2).slice(0, 1400)}
      </pre>
    </div>
  );
}

export function ObjectiveGraphPanel(): JSX.Element {
  const {
    state,
    addObjectiveGraphNode,
    connectObjectiveGraphNodes,
  } = useStudio();

  const [label, setLabel] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Objective label" />
        <button onClick={() => addObjectiveGraphNode(label, 'available')}>Add Node</button>
      </div>

      <div className="graph-toolbar">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source ID" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target ID" />
        <button onClick={() => connectObjectiveGraphNodes(source, target, 'dependency')}>Connect</button>
      </div>

      <div className="graph-node-list">
        {state.objectiveGraphNodes.map((node) => (
          <div key={node.id} className="graph-node-row">
            <span>{node.label}</span>
            <span className="graph-node-meta">{node.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventTriggerPanel(): JSX.Element {
  const { state, addEventTriggerRule } = useStudio();
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('suspicious-login');
  const [actionType, setActionType] = useState('generate-alert');

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
        <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Event type" />
        <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
          <option value="generate-alert">Generate Alert</option>
          <option value="increase-threat-level">Increase Threat</option>
          <option value="notify-analyst">Notify Analyst</option>
          <option value="update-evidence">Update Evidence</option>
        </select>
        <button onClick={() => addEventTriggerRule(name, eventType, actionType)}>Add Rule</button>
      </div>

      <div className="graph-node-list">
        {state.eventTriggerRules.map((rule) => (
          <div key={rule.id} className="graph-node-row">
            <span>{rule.name}</span>
            <span className="graph-node-meta">{rule.condition.eventType}</span>
            <span>{rule.actions[0]?.actionType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScenarioGeneratorPanel(): JSX.Element {
  const { generateScenario } = useStudio();
  const [size, setSize] = useState('medium');
  const [network, setNetwork] = useState('medium');
  const [attacker, setAttacker] = useState('apt');
  const [objective, setObjective] = useState('data-exfiltration');
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="authoring-panel">
      <h4>Scenario Generator</h4>
      <div className="authoring-grid">
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>

        <select value={network} onChange={(e) => setNetwork(e.target.value)}>
          <option value="low">Low Complexity</option>
          <option value="medium">Medium Complexity</option>
          <option value="high">High Complexity</option>
        </select>

        <select value={attacker} onChange={(e) => setAttacker(e.target.value)}>
          <option value="script-kiddie">Script Kiddie</option>
          <option value="insider">Insider</option>
          <option value="apt">APT</option>
        </select>

        <select value={objective} onChange={(e) => setObjective(e.target.value)}>
          <option value="data-exfiltration">Data Exfiltration</option>
          <option value="ransomware">Ransomware</option>
          <option value="credential-theft">Credential Theft</option>
        </select>

        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <button
        className="btn btn-primary"
        onClick={() =>
          generateScenario({
            organizationSize: size,
            networkComplexity: network,
            attackerProfile: attacker,
            vulnerabilityLevel: 'medium',
            defenseLevel: 'basic',
            objective,
            difficulty,
            seed: 42,
          })
        }
      >
        Generate Scenario
      </button>
    </div>
  );
}
