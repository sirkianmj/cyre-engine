# Changelog

All notable changes to CYRE will be documented in this file.

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
