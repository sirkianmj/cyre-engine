# CYRE Studio — Architecture

CYRE Studio is the graphical editor for `@cyre/engine`. It is a React +
Three.js application, but the editor itself is deliberately **not** a React
application in its core: the windowing model, the command layer, the menu
definition and every engine service are framework-free modules that are unit
tested without a DOM.

```
studio/src
├── studio/                 engine integration (no React, no DOM)
│   ├── StudioApplication.ts     the single bridge to @cyre/engine
│   ├── WindowManager.ts         windowing model: open/focus/drag/resize/tile
│   ├── HistoryStack.ts          undo/redo for document edits
│   ├── StudioDocument.ts        the editable document payload
│   └── services/
│       ├── CyberSessionService.ts    CyberSimulation lifecycle + actions
│       ├── ScenarioLibraryService.ts catalog, authoring, validation, import/export
│       ├── TelemetryService.ts       TelemetryRecorder + JSON/CSV/NDJSON export
│       ├── ExperimentService.ts      CyberSimulationExperimentRunner
│       ├── BenchmarkService.ts       engine benchmarks
│       └── SecurityService.ts        sandbox, policy and audit
├── shell/                  the editor shell
│   ├── menuModel.ts             the menu bar as data
│   ├── commandModel.ts          command types + registry indexing
│   ├── commandRegistry.ts       every action in the editor
│   ├── shortcutModel.ts         keyboard map, derived from the registry
│   ├── windowCatalog.ts         window kinds + metadata
│   ├── MenuBar.tsx  WindowFrame.tsx  WindowLayer.tsx
│   ├── TransportBar.tsx  StatusBar.tsx  Notifications.tsx
│   ├── CommandPalette.tsx  StudioWorkspace.tsx
├── windows/                window bodies, grouped by domain
├── ui/                     design-system primitives + icon set
├── components/             the 2D/2.5D/3D viewport and legacy panels
├── rendering/              graph adapters between engine state and the viewport
└── styles/                 design tokens and the legacy panel compat layer
```

## One action, one implementation

Every user-visible action — menu item, toolbar button, keyboard shortcut,
command palette entry, window control — resolves to a **command id** in
`commandRegistry.ts`. The menu bar (`menuModel.ts`) references those ids as
data, so a menu row can never point at an action that does not exist:

```ts
// menuModel.ts
{ id: 'research.telemetry', label: 'Telemetry…', command: 'research.telemetry' }

// commandRegistry.ts
{
  id: 'research.telemetry',
  label: 'Telemetry…',
  category: 'Research',
  windowKind: 'telemetry',
  run: open('telemetry'),
}
```

`src/shell/commandRegistry.test.ts` asserts this in both directions: every
command referenced by the menu bar exists, every `windowKind` resolves to a
catalogued window, every catalogued window has a toggle command, and **every
command in the registry executes without throwing** against a live
`StudioApplication`.

## The windowing system

`WindowManager` is a plain class. It owns window geometry, z-order, focus,
minimized/maximized state, cascade/tile layout and localStorage persistence.
It has no React and no DOM dependency, which is why 20 unit tests can cover
drag clamping, edge-anchored resizing, singleton windows and layout restore
without a browser.

`WindowFrame` is the only piece that touches pointer events: it converts
`pointerdown`/`pointermove` into `onMove` / `onResize` calls on the manager.
Eight resize edges keep the opposite edge anchored, exactly as on a native
desktop.

Window *content* is registered separately in `windows/index.tsx`:

```ts
export const WINDOW_CONTENT: Readonly<Record<WindowKind, WindowContent>> = { … };
```

The `Record<WindowKind, …>` type makes the registry **exhaustive by
construction** — adding a `WindowKind` without a component is a compile error.

## Engine exposure

The editor does not re-implement simulation logic. Each domain has a thin
service that calls the engine and adds bookkeeping:

| Capability | Engine module used |
| --- | --- |
| Simulation, attack chain, defense, step mode | `CyberSimulation`, `CyberScenarioSimulation` |
| Scenario catalog, validation, import/export | `CYBER_SCENARIOS`, `CyberScenarioSandbox`, `SecuritySandboxPolicy`, `serialize/deserializeCyberScenarioDefinition` |
| Telemetry JSON / CSV / NDJSON | `TelemetryRecorder`, `TelemetryExporter` |
| Multi-seed experiments | `CyberSimulationExperimentRunner` |
| Benchmarks | `runCyberSimulationBenchmark`, `runLargeCyberNetworkBenchmark` |
| Security validation | `CyberScenarioSandbox`, `SecurityAuditSystem`, `NetworkGraph` |
| Replay | `CyberSimulation.createReplay` / `CyberSimulation.replay`, `serialize/deserializeCyberReplay` |
| Project authoring | `ProjectManager`, `ProjectExplorer`, `EditorShell` |
| Rendering | `RenderBackendRegistry`, `CyberWorldAdapter`, Three.js viewport |

`CyberSimulation.step()` and `CyberSimulation.getSeed()` were added to the
engine to expose the canonical runtime's deterministic step mode; both are
covered by `engine/src/cyber/__tests__/cyberSimulationStepMode.test.ts`.

### Action availability

Attack and defense actions have real preconditions inside the engine (for
example lateral movement requires admin privileges and a non-isolated host).
`evaluateActionAvailability()` mirrors those guards so the editor can disable
a button **with an accurate reason** instead of letting it throw. The canonical
exploit chain targets the laboratory topology (`web-server`,
`database-server`); on scenarios without those hosts the steps are disabled and
say so explicitly rather than pretending to work.

## Design system

`src/index.css` is token-driven with a dark and a light appearance
(`data-appearance`), reduced-motion support (`data-motion-reduced` plus
`prefers-reduced-motion`), and WCAG-friendly focus rings. The panels that
predate the window system render inside `.cyre-legacy`, which restyles their
original class names with the same tokens — see `src/styles/legacy-panels.css`.

## Testing

| Suite | Scope |
| --- | --- |
| `studio/WindowManager.test.ts` | windowing model, 20 tests, no DOM |
| `shell/commandRegistry.test.ts` | menu/command/registry consistency, 25 tests, no DOM |
| `shell/StudioShell.test.tsx` | menu bar, window drag/resize/minimize/maximize, all 40 window kinds render |
| `windows/windows.test.tsx` | each engine-backed window drives real engine state |
| `studio/*.test.ts` | `StudioApplication` and the engine integration contract |
| `e2e/*.spec.ts` | Playwright workflows against the dev server and the production preview |

The jsdom suite runs with `src/test/setup.ts`, which shims `ResizeObserver`,
`matchMedia` and the 2D canvas context. WebGL is **not** shimmed: when no
context is available the viewport catches the failure, notifies the user and
falls back to the 2D engine, which is the behaviour a real browser without a
GPU should get.
