import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function AssetPipelinePanel(): JSX.Element {
  const {
    state,
    registerAsset,
    importAssetFromContent,
    generateAssetPreviews,
  } = useStudio();

  const [name, setName] = useState('');
  const [type, setType] = useState('image');
  const [content, setContent] = useState('');

  return (
    <div className="authoring-panel">
      <h4>Register Asset</h4>
      <div className="authoring-grid">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Asset name"
        />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="image">Image</option>
          <option value="model">Model</option>
          <option value="texture">Texture</option>
          <option value="audio">Audio</option>
          <option value="font">Font</option>
          <option value="data">Data</option>
          <option value="scenario">Scenario</option>
          <option value="other">Other</option>
        </select>
        <button
          className="btn"
          onClick={() => {
            registerAsset(name, type);
            setName('');
          }}
        >
          Register
        </button>
      </div>

      <h4>Import Asset</h4>
      <div className="authoring-card">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Import name"
        />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="image">Image</option>
          <option value="data">Data</option>
          <option value="scenario">Scenario</option>
          <option value="other">Other</option>
        </select>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Content"
        />
        <button
          className="btn"
          onClick={() => {
            importAssetFromContent(name, type, content);
            setName('');
            setContent('');
          }}
        >
          Import
        </button>
      </div>

      <div className="home-actions">
        <button className="btn" onClick={generateAssetPreviews}>
          Generate Previews
        </button>
      </div>

      <h4>Assets ({state.assets.length})</h4>
      <div className="graph-node-list">
        {state.assets.map((asset) => (
          <div key={String(asset.id)} className="graph-node-row">
            <span>{String(asset.name)}</span>
            <span className="graph-node-meta">{String(asset.type)}</span>
          </div>
        ))}
      </div>

      <h4>Previews ({state.assetPreviews.length})</h4>
      <div className="graph-node-list">
        {state.assetPreviews.map((preview) => (
          <div key={String(preview.id)} className="graph-node-row">
            <span>{String(preview.title)}</span>
            <span className="graph-node-meta">{String(preview.kind)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
