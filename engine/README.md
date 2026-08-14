# CYRE Engine

Core simulation, modules, and infrastructure for the CYRE engine.

## Internal Structure
```bash
engine/src/
├── core # Minimal engine foundation (lifecycle, config, logging, modules)
├── simulation # Domain-agnostic simulation engine (time, scheduling, state)
├── cyber # Cybersecurity-specific simulation (hosts, networks, attacks, defenses)
├── scenario # Scenario definition, loading, validation, procedural generation
├── game # Game systems (missions, objectives, progression)
├── rendering # Rendering abstraction (2D, 2.5D, future 3D)
├── platform # Platform abstraction (web, mobile, desktop, console)
├── analytics # Telemetry, research data, structured event recording
├── automation # APIs, WebSockets, webhooks for automation integration
└── shared # Shared types, utilities, and constants


```
Each module is independently testable and replaceable.  
Modules communicate through well-defined interfaces managed by the Core.
