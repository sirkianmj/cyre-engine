# Changelog

All notable changes to CYRE will be documented in this file.

## [Unreleased]

### Added
- CYRE Studio shell overhaul: native-style menu bar (File, Edit, View, Scenarios,
  Simulation, Visualize, Research, Replay, Tools, Window, Help) replacing the
  persistent tab strips.
- A real windowing system: 40 window kinds that are draggable, resizable from
  eight edges, minimizable to a tray, maximizable, focusable and restorable,
  with cascade/tile layout and persisted desktop state.
- One command registry behind the menu bar, toolbar, ⌘K palette and keyboard
  shortcuts, so every action has exactly one implementation.
- Studio engine services exposing capabilities that had no GUI: deterministic
  seed selection and step mode, the full attack chain with live preconditions,
  detection/alerts/evidence and defender containment, telemetry export in
  JSON/CSV/NDJSON, the multi-seed experiment runner with run comparison, both
  engine benchmarks, and scenario sandbox/security-audit validation.
- Cyber scenario authoring: library with catalog and custom scenarios,
  duplicate/delete, JSON import/export, a draft editor with structural
  validation and undo/redo.
- Replay playback: record, save/load JSON, frame-by-frame stepping, jump and
  bookmarks driven by the engine replay log.
- Token-driven design system with dark and light appearances, reduced-motion
  support, focus rings, empty/loading/error states and confirmations for
  destructive actions.
- `CyberSimulation.step()` and `CyberSimulation.getSeed()` in the engine, with
  determinism tests.
- `docs/STUDIO.md` describing the editor architecture.

### Changed
- Studio now opens directly into the viewport; the boot gate and home screen
  were removed.
- Existing authoring and production panels are presented as windows and
  restyled through a compatibility layer instead of dock tabs.

### Fixed
- The 3D viewport now degrades to the 2D engine with a notification when no
  WebGL context is available instead of failing silently.
- An explicitly chosen simulation seed is no longer overridden by the selected
  scenario's catalog seed.

### Tests
- Engine + Studio: 161 test files / 1634 tests (Studio alone: 10 files / 140 tests).
- Playwright: 19 dev workflows plus 2 production-preview checks.

## [1.0.2] - 2026-08-23

### Changed
- Removed misleading roadmap section from README to avoid unsupported claims.
- Updated current status to accurately reflect the released CYRE Studio feature set.
- Bumped package versions to 1.0.2.

## [1.0.1] - 2026-08-23

### Added
- CYRE Studio professional editor with real 2D, 2.5D, and 3D engine viewports
- Unreal-like window system with persistent layout and Windows menu
- Real asset import/export pipeline with checksums, metadata, and previews
- Mission 001 playthrough actions, live status, and campaign progression
- Authoring tools generate/load scenarios into Play Mode
- Build & deployment hardening for web, desktop, and mobile packages

### Fixed
- Duplicate test blocks and dead `engine-viewport` panel
- Play/Pause/Stop/Resume status consistency
- Runtime viewport feedback in 2D/2.5D/3D modes
- Imported assets registered into asset manager

## [1.0.0] - 2026-08-17

### Added
- Core engine foundation (lifecycle, configuration, logging, error handling, modules)
- Module system with dependencies and topological ordering
- Entity, event bus, state container, and clock
- Cyber simulation: entities, network graph, identity/permissions, vulnerabilities, attack/defense models
- Game systems: missions, evidence, attack graph, investigation mechanics, scoring/progression
- Scenario system: representation, loader, registry, validator, editor
- Debug inspector, event timeline, replay system
- Testing framework (determinism checker, scenario helper, test harness)
- 2D UI foundation (terminal, dashboard, renderer)
- UX/Polish (accessibility, feedback, onboarding)
- Telemetry and research dataset pipeline
- Automation API (REST, webhooks)
- n8n integration
- Web release server
- Mobile platform adapters and touch input
- Desktop platform adapters and file storage
- Controller/console readiness (gamepad, performance profiles, resolution)
- Predefined missions: Mission 001, Mission 002, Mission 003
- Campaign progression and difficulty levels

### Changed
- Fixed various test expectations and import issues
- Improved scenario validation and editor

### Security
- Proprietary license enforced
- No real-world offensive capabilities
