import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function ScriptingPluginPanel(): JSX.Element {
  const {
    state,
    createSampleCyreScript,
    registerCyreScriptFromDefinition,
    registerSamplePlugin,
  } = useStudio();

  const [definition, setDefinition] = useState('');
  const [pluginName, setPluginName] = useState('');

  return (
    <div className="authoring-panel">
      <h4>CYRE Scripts ({state.cyreScripts.length})</h4>

      <div className="authoring-card">
        <button
          className="btn btn-primary"
          onClick={createSampleCyreScript}
        >
          Create Sample Script
        </button>
      </div>

      <div className="authoring-card">
        <textarea
          value={definition}
          onChange={(event) => setDefinition(event.target.value)}
          placeholder='{"id":"custom-script","name":"Custom Script"}'
        />
        <button
          className="btn"
          onClick={() => {
            try {
              const parsed = JSON.parse(definition);
              registerCyreScriptFromDefinition(parsed);
              setDefinition('');
            } catch {
              alert('Invalid JSON definition.');
            }
          }}
        >
          Register from JSON
        </button>
      </div>

      <div className="graph-node-list">
        {state.cyreScripts.map((script) => (
          <div key={String(script.id)} className="graph-node-row">
            <span>{String(script.name)}</span>
            <span className="graph-node-meta">{String(script.id)}</span>
          </div>
        ))}
      </div>

      <h4>CYRE Plugins ({state.cyrePluginInfos.length})</h4>

      <div className="authoring-card">
        <input
          value={pluginName}
          onChange={(event) => setPluginName(event.target.value)}
          placeholder="Plugin name"
        />
        <button
          className="btn"
          onClick={() => {
            registerSamplePlugin(pluginName);
            setPluginName('');
          }}
        >
          Register Plugin
        </button>
      </div>

      <div className="graph-node-list">
        {state.cyrePluginInfos.map((info) => (
          <div key={String(info.id)} className="graph-node-row">
            <span>{String(info.name)}</span>
            <span className="graph-node-meta">{String(info.state)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
