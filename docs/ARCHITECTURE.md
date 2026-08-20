# CYRE Architecture Overview

CYRE is a modular, domain-specific simulation and game engine for cybersecurity applications.

## Module Boundaries

| Module | Responsibility |
| --- | --- |
| `analytics` | Telemetry event recording and export. |
| `automation` | REST API, webhooks, WebSockets, n8n, and automation integration. |
| `core` | Core engine lifecycle, configuration, logging, modules, entities, events, state, and clocks. |
| `cyber` | Cybersecurity simulation entities, network graphs, identity, permissions, vulnerabilities, attack and defense models. |
| `debug` | Debugger, inspector, profiling, diagnostics, and audit tooling. |
| `editor` | Professional CYRE editor domain models, docking, inspectors, palettes, and graph editors. |
| `game` | Gameplay systems, missions, evidence, investigation, progression, scripting, plugins, agents, difficulty, and multiplayer. |
| `platform` | Platform adapters, input, packaging, console architecture, audio, and compatibility audit. |
| `project` | CYRE project model, templates, and lifecycle management. |
| `replay` | Simulation replay recording and playback. |
| `research` | Research datasets, experimental scenario framework, reproducibility, and dashboards. |
| `scenario` | Scenario representation, loading, validation, registry, editor, and procedural generation. |
| `scene` | Scene model, registry, and editing support. |
| `serialization` | Project, scenario, and schema serialization primitives. |
| `timeline` | Event timeline storage and querying. |
| `ui` | UI components, themes, design system, motion, game UI, visual polish, and UX audits. |

Cross-module imports must use public module indexes. Internal files must not be imported across module boundaries.
