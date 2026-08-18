# CYRE Public API Specification v1

## 1. Purpose

This document defines the public API surface for CYRE — Cybersecurity Reality Engine.

CYRE distinguishes between:

- Public APIs: stable, versioned, documented, safe for external consumers
- Internal APIs: implementation details, subject to change without notice

No public API may be exposed accidentally through a barrel export or module boundary.

---

## 2. Public API Principles

### 2.1 Stability

Public APIs follow semantic versioning.

A breaking change to a public API requires a major version increase.

### 2.2 Documentation

Every public export must have:

- purpose
- inputs
- outputs
- side effects
- errors
- example usage

### 2.3 Versioning

Public API versions follow:

    MAJOR.MINOR.PATCH

Where:

- MAJOR = incompatible public API changes
- MINOR = backward-compatible additions
- PATCH = backward-compatible fixes

### 2.4 Deprecation

Deprecated APIs must:

- remain functional for at least one minor release
- emit a deprecation warning where applicable
- be documented in the changelog
- be removed only in a major release

---

## 3. Public API Surface

### 3.1 Core

Publicly stable core exports:

- Engine lifecycle
- Configuration
- Logger
- Error types
- Entity identity
- Event bus subscription and publishing
- State container read access
- Clock abstraction

### 3.2 Cyber Simulation

Publicly stable cyber exports:

- Cyber entity base identity
- Host, Server, Client, Router, Firewall, Database
- Service, User, Account
- Role, Privilege, Session
- Vulnerability representation
- Network graph operations
- Attack state and stage
- Defense state and action

### 3.3 Game Systems

Publicly stable gameplay exports:

- Mission definition and status
- Objective
- Evidence and evidence collection
- Alert and alert status
- Investigation state and phase
- Hypothesis
- Attack graph
- Scoring types and calculator
- Player progression
- Campaign and difficulty

### 3.4 Scenario System

Publicly stable scenario exports:

- Scenario types
- Scenario loading
- Scenario validation
- Scenario registry
- Scenario editor API

### 3.5 Professional Infrastructure

Publicly stable infrastructure exports:

- Debug inspector
- Event timeline
- Replay recorder and player
- Telemetry recorder and exporter
- Research dataset management
- Automation API types
- Webhook registry
- n8n integration types

### 3.6 Platform Adapters

Publicly stable platform exports:

- Platform adapter interface
- Memory storage adapter
- File storage adapter
- Mobile platform adapter
- Desktop platform adapter
- Console platform adapter
- Input device abstraction
- Touch, gamepad, and keyboard adapter interfaces
- Performance profile and resolution settings

### 3.7 UI Foundation

Publicly stable UI exports:

- UI component base
- Terminal UI
- Dashboard UI
- UI renderer abstraction
- Accessibility settings
- Feedback system
- Onboarding manager

---

## 4. Internal APIs

The following are internal and must not be considered stable:

- Module registration internals
- Private event bus history management
- State container mutation methods
- Entity lifecycle internals
- Network graph internal adjacency structures
- Attack state transition internals
- Defense state transition internals
- Scenario validator internal rules
- Replay event serialization details
- Telemetry storage implementation
- Web server routing internals
- Automation server socket handling
- Desktop app bootstrap internals

Internal APIs may change without notice, but should still be tested.

---

## 5. Module Contracts

Every public module must define:

### 5.1 Name

Unique kebab-case or PascalCase module name.

### 5.2 Purpose

One sentence explaining why the module exists.

### 5.3 Public Exports

Explicit list of exported classes, functions, types, and constants.

### 5.4 Dependencies

Modules this module depends on.

### 5.5 Lifecycle Hooks

Which engine lifecycle hooks the module uses:

- initialize
- start
- stop
- shutdown

### 5.6 Error Boundaries

Errors this module may throw, and how they should be handled.

### 5.7 Serialization

Whether the module state is serializable, and if so, which format version it uses.

---

## 6. Extension Points

CYRE exposes the following official extension points:

### 6.1 Cyber Entity Extensions

Custom cyber entities must extend `CyberEntity`.

### 6.2 Attack Stage Extensions

Custom attack stages must follow the `AttackStage` contract.

### 6.3 Defensive Action Extensions

Custom defensive actions must follow the `DefensiveAction` contract.

### 6.4 Mission Factory Registration

Custom missions register with `MissionFactory`.

### 6.5 Scenario Registry

Custom scenarios register with `ScenarioRegistry`.

### 6.6 Platform Adapter

Custom platform targets implement `PlatformAdapter`.

### 6.7 UI Component

Custom UI components extend `UIComponent`.

### 6.8 Automation Connector

Custom automation integrations use the webhook and event types.

Future plugin architecture will formalize these extension points further.

---

## 7. Public API Export Rules

Public APIs must be exported from their module index.

Internal APIs must not be exported from a module index.

No file may import an internal implementation from a public module path.

Barrel exports must not include files marked internal.

---

## 8. Public API Review Trigger

A public API review is required when:

- a public export signature changes
- a new public export is added
- a deprecated API is removed
- a module contract changes
- serialization format changes
- a new extension point is introduced

---

## 9. Definition of Done

This public API specification is complete when:

- all current public exports are identified
- internal APIs are clearly separated
- module contracts are documented
- versioning and deprecation policies are defined
- extension points are listed
- tests still pass
- build succeeds
