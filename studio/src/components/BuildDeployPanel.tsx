import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function BuildDeployPanel(): JSX.Element {
  const {
    state,
    registerBuildProfile,
    buildProfile,
    setReleaseChannel,
    runCiCdPipeline,
    packageWebGame,
    packageDesktopGame,
    packageMobileGame,
  } = useStudio();

  const [profileId, setProfileId] = useState('web-development');
  const [profileName, setProfileName] = useState('Web Development');
  const [profileTarget, setProfileTarget] = useState('web');
  const [profileFlavor, setProfileFlavor] = useState('development');
  const [packageName, setPackageName] = useState('CYRE Game');

  return (
    <div className="authoring-panel">
      <h4>Build Profile</h4>
      <div className="authoring-grid">
        <input
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
          placeholder="Profile ID"
        />
        <input
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          placeholder="Profile Name"
        />
        <select
          value={profileTarget}
          onChange={(event) => setProfileTarget(event.target.value)}
        >
          <option value="web">Web</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="console">Console</option>
        </select>
        <select
          value={profileFlavor}
          onChange={(event) => setProfileFlavor(event.target.value)}
        >
          <option value="development">Development</option>
          <option value="testing">Testing</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
        <button
          className="btn"
          onClick={() =>
            registerBuildProfile(
              profileId,
              profileName,
              profileTarget,
              profileFlavor,
            )
          }
        >
          Register Profile
        </button>
      </div>

      <div className="home-actions">
        <button className="btn" onClick={() => buildProfile(profileId)}>
          Build Profile
        </button>
        <button className="btn" onClick={runCiCdPipeline}>
          Run CI/CD
        </button>
      </div>

      <h4>Release Channel</h4>
      <select
        value={state.activeReleaseChannel}
        onChange={(event) => setReleaseChannel(event.target.value)}
      >
        {state.releaseChannels.map((channel) => (
          <option key={channel} value={channel}>
            {channel}
          </option>
        ))}
      </select>

      <h4>Packaging</h4>
      <div className="authoring-card">
        <input
          value={packageName}
          onChange={(event) => setPackageName(event.target.value)}
          placeholder="Package name"
        />
        <div className="home-actions">
          <button className="btn" onClick={() => packageWebGame(packageName)}>
            Web
          </button>
          <button className="btn" onClick={() => packageDesktopGame(packageName)}>
            Desktop
          </button>
          <button className="btn" onClick={() => packageMobileGame(packageName)}>
            Mobile
          </button>
        </div>
      </div>

      <h4>Build Profiles ({state.buildProfiles.length})</h4>
      <div className="graph-node-list">
        {state.buildProfiles.map((profile) => (
          <div key={String(profile.id)} className="graph-node-row">
            <span>{String(profile.name)}</span>
            <span className="graph-node-meta">{String(profile.target)}</span>
          </div>
        ))}
      </div>

      <h4>Packaging Results ({state.packagingResults.length})</h4>
      <div className="graph-node-list">
        {state.packagingResults.map((result, index) => (
          <div key={index} className="graph-node-row">
            <span>Package {index + 1}</span>
            <span className="graph-node-meta">{String(result.name ?? '')}</span>
          </div>
        ))}
      </div>

      {state.ciCdResult && (
        <pre className="authoring-preview">
          {JSON.stringify(state.ciCdResult, null, 2).slice(0, 1200)}
        </pre>
      )}
    </div>
  );
}
