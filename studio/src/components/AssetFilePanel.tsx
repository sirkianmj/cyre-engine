import { useRef, useState } from 'react';
import { useStudio } from '../studio/StudioContext';

function typeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) return 'image';
  if (['glb', 'gltf', 'obj', 'fbx'].includes(extension)) return 'model';
  if (['png', 'jpg', 'jpeg', 'webp', 'ktx2'].includes(extension)) return 'texture';
  if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font';
  if (['json', 'csv', 'xml'].includes(extension)) return 'data';
  return 'other';
}

export function AssetFilePanel(): JSX.Element {
  const {
    state,
    registerAsset,
    importAssetFromContent,
    generateAssetPreviews,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<'import' | 'export'>('import');

  const handleFiles = async (files: FileList | File[]): Promise<void> => {
    for (const file of Array.from(files)) {
      const name = file.name || 'asset';
      const type = typeFromName(name);

      if (file.type.startsWith('text') || type === 'data' || type === 'scenario') {
        const content = await file.text();
        importAssetFromContent(name, type, content);
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        registerAsset(name, type, dataUrl);
      }
    }

    generateAssetPreviews();
  };

  const exportJson = (filename: string, data: unknown): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <button className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>
          Import
        </button>
        <button className={mode === 'export' ? 'active' : ''} onClick={() => setMode('export')}>
          Export
        </button>
      </div>

      {mode === 'import' && (
        <>
          <div
            className={`asset-drop-zone ${dragActive ? 'active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFiles(event.dataTransfer.files);
            }}
          >
            <strong>Drag & Drop Assets Here</strong>
            <button
              className="btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) {
                  void handleFiles(event.target.files);
                }
              }}
            />
          </div>

          <h4>Imported Assets ({state.assets.length})</h4>
          <div className="graph-node-list">
            {state.assets.map((asset) => (
              <div key={String(asset.id)} className="graph-node-row">
                <span>{String(asset.name)}</span>
                <span className="graph-node-meta">{String(asset.type)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'export' && (
        <div className="authoring-grid">
          <button
            className="btn"
            onClick={() => exportJson('cyre-project.json', state.projectData ?? {})}
          >
            Export Project JSON
          </button>
          <button
            className="btn"
            onClick={() => exportJson('cyre-assets.json', state.assets)}
          >
            Export Asset Manifest
          </button>
          <button
            className="btn"
            onClick={() =>
              exportJson('cyre-scenario.json', state.currentScenarioData ?? {})
            }
          >
            Export Scenario
          </button>
        </div>
      )}
    </div>
  );
}
