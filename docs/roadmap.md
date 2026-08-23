# CYRE Roadmap — Closing Verified Gaps

> This roadmap replaces the earlier “40 sprints complete” document.
> It reflects the forensic audit findings and the current implementation state.
> A subsystem is marked **Done** only when it has implementation, tests, integration, and verification.

---

## 1. Current Verified Baseline

The repository contains:

- A real TypeScript modular engine core
- A concrete cyber domain model
- Scenario loading, validation, generation, and editor APIs
- Mission/game systems with playable mission scenarios
- Replay event recording/playback
- Telemetry recording/export
- Research experiment/reproducibility infrastructure
- Automation API/webhook/n8n integration
- Platform package/manifest abstractions
- Rendering abstraction and Studio React/Three.js viewports
- Extensive engine tests and Studio tests
- GitHub Actions CI workflow

The following are **not yet complete**:

- Unified deterministic simulation runtime
- Deterministic simulation replay
- Full GPU rendering backend inside the engine
- Native mobile/desktop build artifact generation
- Mature empirical research/analytics pipeline
- Fully state-derived mission scoring and investigation mechanics

---

## 2. Audit-Confirmed Gaps

| Gap | Audit Finding | Status |
|---|---|---|
| `simulation/` kernel | Only `SimulationProfiler` and index; no tick/world/action runtime | Not implemented |
| Deterministic replay | Replay replays recorded events; does not rebuild/simulate state | Not implemented |
| Mission completion | `completeMission()` auto-completes remaining objectives | Implemented; should be redesigned |
| Mission scoring | `getScore()` uses hard-coded metrics | Implemented; should be state-derived |
| Evidence investigation | Evidence preloaded in constructor | Implemented; should be progressive |
| Rendering backend | Engine `Renderer3D` returns command objects; no GPU submit | Abstraction only |
| Platform packaging | Packagers create manifests; no native binaries | Abstraction only |
| Research analytics | Real experiment/reproducibility infra, but no statistical analysis pipeline | Foundation only |
| CI/CD | Previously absent; now GitHub Actions exists | Fixed |
| Documentation accuracy | README/roadmap previously overclaimed v1.0 completeness | Being fixed |

---

## 3. Roadmap Phases

### Phase 0 — Honest Baseline Stabilization

- Add **Known Limitations** section to README
- Remove stale screenshot/roadmap contradictions
- Keep CI green
- Freeze current public API while hardening internals

**Definition of Done:**

- README accurately labels implemented/prototype/experimental
- No contradictory version or screenshot claims
- CI runs `install`, `test`, `build`, `audit:engine`

---

### Phase 1 — Deterministic Simulation Kernel

Implement a small authoritative simulation runtime:

- `SimulationClock` injection
- `SimulationWorld<TState>`
- `SimulationTickScheduler`
- `SimulationAction`
- deterministic ordering
- event emission

**Definition of Done:**

- A test creates a world, schedules actions, advances time, and asserts deterministic state/events
- No `Date.now()` inside simulation state transitions
- Engine architecture audit still passes

---

### Phase 2 — Cyber World State Transitions

Make cyber entities participate in a shared state graph:

- Attacker action changes network/host state
- Vulnerability exploitation modifies privileges
- Detection produces alerts
- Defender actions modify world state

**Definition of Done:**

- A generated scenario can be executed in SimulationWorld
- Events are emitted from actual state changes
- End-to-end test: attack path → detection → containment → state mutation

---

### Phase 3 — Mission and Scoring Refactor

- Remove hard-coded `completeMission()` auto-completion
- Derive objective completion from simulation state
- Calculate score from observed metrics, not fixed constants
- Evidence reviewed incrementally through investigation, not preloaded as known state

**Definition of Done:**

- Mission success requires all objectives genuinely completed
- Score changes when player actions change investigation quality/containment
- Tests verify that preloaded evidence does not equal reviewed evidence

---

### Phase 4 — Deterministic Simulation Replay

- Record authoritative simulation inputs and state transitions
- Re-execute simulation from seed/initial state
- Compare final checksums
- Replay UI uses reconstructed state

**Definition of Done:**

- A recorded simulation run can be replayed to an identical final state
- Checksums match
- Divergence test fails when behavior changes

---

### Phase 5 — Rendering Backend Integration

- Keep the current RenderCommand abstraction
- Add a real Three.js render backend in engine or a formal engine-to-Studio presentation adapter
- Ensure SimulationWorld never depends on rendering

**Definition of Done:**

- 2D, 2.5D, and 3D modes render through actual graphics API/Three.js
- Same scenario renders in all modes without simulation changes
- Backend tests verify commands and actual draw calls where applicable

---

### Phase 6 — Real Platform Packaging

- Implement real build pipelines for web, desktop, and mobile
- Generate actual deployable artifacts:
  - Web static bundle
  - Desktop app package
  - Mobile project/build artifact

**Definition of Done:**

- CI produces at least one real build artifact
- Packaging tests verify artifact existence and metadata
- No false claim of native support until artifacts exist

---

### Phase 7 — Research and Analytics Platform

- Add experiment run reports
- Dataset export/schema versioning
- Basic statistical summaries
- Scenario/condition comparison

**Definition of Done:**

- An experiment can be run multiple times with different seeds/conditions
- Results exported in a structured format
- A basic report shows participant outcomes and score distributions

---

### Phase 8 — Documentation and Release Verification

- Update README, CHANGELOG, and roadmap to match implementation
- Add architecture docs for each verified subsystem
- Tag release only after CI, test, build, and artifact verification

**Definition of Done:**

- No unresolved “complete” claims for unverified subsystems
- Release notes list implemented, prototype, and known limitations
- Latest tag passes all checks

---

## 4. Explicit Non-Goals

CYRE will **not**:

- Build a general-purpose Unreal/Unity competitor
- Build a custom physics/animation/AAA renderer
- Claim production readiness for abstraction-only packagers
- Treat replay of event records as deterministic simulation replay
- Mark a phase complete without end-to-end verification

---

## 5. Release Readiness Checklist

A future major release should require:

- Unified simulation runtime
- State-derived mission/scoring
- Deterministic replay
- Real rendering backend integration
- At least one real platform artifact
- Research dataset export/report
- Accurate documentation and known limitations
- Green CI across all packages

Until then, the project should be described as:

> **Early functional domain-specific cybersecurity engine/platform with a substantial Studio and broad foundational modules.**
