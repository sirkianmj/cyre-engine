# CYRE Package Architecture v1

## 1. Purpose

This document defines the logical package structure for CYRE — Cybersecurity Reality Engine.

CYRE is organized as a monorepo. Logical package boundaries exist inside the repository even when packages are not published separately.

The goal is clean boundaries, not maximum package count.

---

## 2. Monorepo Layout

    CYRE/
    ├── engine/
    │   └── src/
    │       ├── core/
    │       ├── cyber/
    │       ├── game/
    │       ├── scenario/
    │       ├── debug/
    │       ├── timeline/
    │       ├── replay/
    │       ├── testing/
    │       ├── ui/
    │       ├── automation/
    │       ├── analytics/
    │       ├── research/
    │       ├── platform/
    │       ├── web/
    │       ├── rendering/
    │       ├── simulation/
    │       └── shared/
    ├── game/
    ├── tools/
    ├── research/
    ├── docs/
    └── experiments/

The engine directory remains the primary runtime package.

Other top-level directories are logical product zones, not runtime packages.

---

## 3. Logical Package Boundaries

### 3.1 core

The engine kernel.

Owns:

- engine lifecycle
- configuration
- logging
- error handling
- module management
- deterministic clock
- entity identity
- event bus
- state container

Dependencies:

- none

### 3.2 cyber

The cybersecurity simulation layer.

Owns:

- cyber entities
- hosts
- servers
- clients
- routers
- firewalls
- databases
- services
- users
- accounts
- roles
- privileges
- sessions
- vulnerabilities
- attack states
- defense states
- network graphs
- access control

Dependencies:

- core

### 3.3 game

The gameplay layer.

Owns:

- missions
- objectives
- evidence
- alerts
- investigation
- hypotheses
- attack graphs
- scoring
- progression
- campaign
- difficulty

Dependencies:

- core
- cyber

### 3.4 scenario

The scenario system.

Owns:

- scenario schema
- scenario loading
- scenario registry
- scenario validation
- scenario editor API

Dependencies:

- core
- cyber
- game

### 3.5 debug

Engine debugging tooling.

Owns:

- debug inspector
- debug snapshots

Dependencies:

- core
- cyber
- game

### 3.6 timeline

Event timeline tooling.

Owns:

- chronological event storage
- timeline queries

Dependencies:

- core

### 3.7 replay

Replay tooling.

Owns:

- replay recording
- replay playback
- replay events

Dependencies:

- core
- timeline

### 3.8 testing

Testing utilities for CYRE scenarios and simulations.

Owns:

- test harness
- determinism checker
- scenario test helper

Dependencies:

- core
- scenario
- game
- cyber

### 3.9 ui

2D UI foundation.

Owns:

- UI component base
- terminal UI
- dashboard UI
- UI renderer abstraction
- accessibility settings
- feedback system
- onboarding manager

Dependencies:

- core

### 3.10 automation

Automation and integration layer.

Owns:

- automation server
- automation types
- webhook client
- webhook registry
- n8n integration
- cyber event types

Dependencies:

- core

### 3.11 analytics

Telemetry and analytics.

Owns:

- telemetry event
- telemetry recorder
- telemetry exporter

Dependencies:

- core

### 3.12 research

Research dataset management.

Owns:

- research types
- research dataset

Dependencies:

- core
- scenario

### 3.13 platform

Platform adapters and input abstractions.

Owns:

- platform adapter interface
- memory storage adapter
- file storage adapter
- mobile platform adapter
- desktop platform adapter
- console platform adapter
- input device abstraction
- touch input adapter
- gamepad input adapter
- performance profile
- resolution settings
- desktop app bootstrap

Dependencies:

- core
- game
- scenario
- web

### 3.14 web

Web runtime and server.

Owns:

- web application
- web server

Dependencies:

- core
- game
- scenario
- platform

### 3.15 rendering

Rendering abstraction placeholder.

Current state:

- placeholder index
- future rendering backends

Dependencies:

- none in current implementation

### 3.16 simulation

Generic simulation placeholder.

Current state:

- placeholder index
- future generic simulation contracts

Dependencies:

- none in current implementation

### 3.17 shared

Shared utility types and helpers.

Current state:

- placeholder index
- shared contracts if introduced later

Dependencies:

- none in current implementation

---

## 4. Dependency Direction Rules

Dependencies must flow in this order:

    core
      ^
      |
    cyber
      ^
      |
    game
      ^
      |
    scenario

Higher-level tooling may depend on the layers above, but never the reverse.

The following dependencies are forbidden:

- core depending on cyber
- cyber depending on game
- game depending on scenario
- scenario depending on platform
- platform depending on automation
- automation depending on research
- ui depending on cyber
- ui depending on game

Cross-cutting concerns must be extracted into core or shared, not imported across layers.

---

## 5. Public and Internal Exports

Each logical package exposes an index file.

The index file exports only public APIs.

Internal implementation files must not be imported by other packages.

Barrel exports must not leak internal symbols.

---

## 6. Future Packages

The following packages may be introduced later:

- editor
- studio
- assets
- scripting
- plugins
- multiplayer
- ai

They will follow the same boundary and dependency rules.

---

## 7. Package Creation Rules

A new package is justified only when:

- it has a clear domain responsibility
- it does not depend on sibling packages in the same layer
- it is not a placeholder without a defined purpose
- it reduces coupling rather than increasing it

Do not split a working package merely to create more packages.

---

## 8. Definition of Done

This package architecture is complete when:

- all existing logical packages are mapped
- dependency direction is explicit
- public and internal export rules are documented
- future package policy is clear
- tests pass
- build succeeds
