# CYRE Architecture Specification v1

## 1. Purpose

This document is the authoritative architectural reference for CYRE — Cybersecurity Reality Engine.

It defines:

- architectural boundaries
- core principles
- module responsibilities
- public API policy
- serialization requirements
- editor/runtime/game separation
- presentation and platform boundaries
- forbidden architectural directions

All future development must remain consistent with this specification unless it is intentionally revised through the CYRE architecture change process.

---

## 2. Project Definition

CYRE is a modular, domain-specific game and simulation engine for cybersecurity games, cyber simulations, serious games, training environments, research experiments, and interactive cyber worlds.

CYRE is not a general-purpose engine. It competes with professional engines only within its specialized domain.

---

## 3. Core Architectural Principles

### 3.1 Simulation First

The cyber simulation is the heart of CYRE.

A mission must change real simulated cyber state, not merely present scripted outcomes.

### 3.2 Domain-Specific by Design

CYRE must understand cybersecurity concepts natively:

- organizations
- networks
- hosts
- identities
- services
- vulnerabilities
- attacks
- evidence
- incidents
- investigations
- decisions

CYRE does not rebuild these concepts from generic game primitives.

### 3.3 Rendering Independence

The simulation must not depend on a specific rendering backend.

The same scenario may be presented as:

- 2D interface
- 2.5D tactical map
- 3D environment
- future high-fidelity 3D

Rendering is a presentation concern.

### 3.4 Platform Independence

The simulation and gameplay logic must not depend on web, mobile, desktop, or console APIs.

Platform adapters wrap platform-specific concerns.

### 3.5 Separation of Concerns

Four layers must remain distinct:

    Simulation     -> What is happening?
    Game           -> What does the player need to accomplish?
    Presentation   -> How does the player see it?
    Platform       -> Where does the game run?

### 3.6 Small Core, Massive Capability

CYRE must not become a bloated general-purpose engine.

If a capability does not directly improve cyber simulation, cyber gameplay, cross-platform delivery, research, automation, or the flagship game, it does not belong in CYRE Core.

---

## 4. Architectural Segmentation

                         CYRE
                          |
              +-----------+-----------+
              |                       |
         CYRE ENGINE              CYRE STUDIO
              |                       |
              |                Professional Editor
              |                       |
       +------+-------+       +-------+--------+
       |              |       |       |        |
   Simulation      Runtime   Scene   Asset   Debug
       |              |       Editor  Editor  Tools
       |              |
       +------+-------+
              |
       Presentation Layer
              |
       +------+---------------+
       |      |               |
      2D     2.5D            3D
       |      |               |
       +------+---------------+
              |
       Platform Layer
              |
   Web / iOS / Android / Desktop
              |
        Future Consoles

CYRE Engine, CYRE Studio, and CYRE Game are related but separate products.

---

## 5. Engine Kernel Boundaries

The Engine kernel owns:

- lifecycle
- configuration
- logging
- errors
- module management
- deterministic clock
- entities
- event bus
- state containers

The kernel must not know about cybersecurity concepts.

---

## 6. Cyber Simulation Layer

The cyber layer owns:

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
- permissions
- roles
- privileges
- sessions
- vulnerabilities
- attack states
- defensive states
- network graphs
- access control

This layer implements the actual cyber simulation.

---

## 7. Gameplay Layer

The gameplay layer owns:

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

The gameplay layer must remain separate from the cyber simulation.

---

## 8. Scenario System

The scenario system owns:

- scenario schema
- scenario loading
- scenario registry
- scenario validation
- scenario editor
- procedural scenario generation direction

Scenarios are data, not engine code.

---

## 9. CYRE Studio

CYRE Studio is the professional editor environment.

It owns:

- project management
- scene editor
- graph editors
- inspectors
- mission designer
- timeline editor
- asset management
- build pipeline
- debugging tools
- research tooling

CYRE Studio must not inject editor-specific dependencies into the engine runtime.

---

## 10. Presentation Layer

The presentation layer owns:

- UI framework
- design system
- rendering abstraction
- 2D renderer
- 2.5D renderer
- 3D foundation
- specialized cyber-world visualization

The presentation layer consumes simulation state but never mutates it directly.

---

## 11. Platform Layer

The platform layer owns:

- web runtime
- mobile packaging
- desktop packaging
- console readiness
- input abstraction
- storage abstraction
- performance profiles
- resolution handling

Platform adapters are replaceable.

---

## 12. Professional Infrastructure

CYRE includes professional support systems:

- replay
- debug inspector
- event timeline
- telemetry
- research dataset
- REST API
- WebSocket event stream
- webhooks
- n8n integration

These systems are first-class but remain optional modules.

---

## 13. Public API Policy

### 13.1 Internal vs Public

CYRE must distinguish:

    Internal APIs
      vs
    Public CYRE APIs

Internal APIs may change frequently.

Public APIs follow versioning and deprecation policies.

### 13.2 API Stability

Public APIs must:

- be documented
- be versioned
- support deprecation periods
- avoid breaking changes without major version bump
- expose clear extension points

### 13.3 Module Contracts

Every module must define:

- public exports
- internal implementation
- dependencies
- lifecycle hooks
- error boundaries
- serialization format

---

## 14. Serialization Foundation

CYRE must support versioned serialization for:

- projects
- scenes
- organizations
- networks
- entities
- scenarios
- missions
- editor settings
- research experiments

Serialization formats must include:

- schema version
- deterministic IDs
- validation
- migration path

---

## 15. Determinism and Reproducibility

CYRE must support deterministic simulation where configured.

Deterministic features:

- seeded random
- manual clock
- deterministic event ordering
- replayable event streams
- reproducible experiments

---

## 16. Forbidden Architectural Directions

CYRE must not:

- attempt to become Unreal Engine or Unity
- build a custom general-purpose renderer
- build a custom physics engine
- build a custom animation engine
- build a custom audio engine
- build a custom programming language
- build a generic UI framework from scratch
- allow the cyber simulation to depend on rendering technology
- allow editor code to leak into the engine runtime
- allow platform-specific code to leak into the simulation

---

## 17. Architectural Review Trigger

The architecture must be reviewed when:

- a new module crosses more than one layer
- a new dependency introduces a general-purpose engine capability
- a feature is proposed that does not serve the cyber domain
- public APIs require breaking changes
- serialization formats require migration
- rendering work begins to influence simulation design

---

## 18. Definition of Done for Architecture Changes

An architecture change is complete when:

- this specification is updated
- module boundaries are documented
- public APIs are documented
- serialization changes are versioned
- tests pass
- build succeeds
- no unnecessary dependency is introduced
