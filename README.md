# CYRE — Cybersecurity Reality Engine

**Domain-Specific Game & Simulation Engine for Cybersecurity**

CYRE is a modular, extensible, domain-specific game and simulation engine designed specifically for building high-quality interactive cybersecurity games and cyber-simulation applications.

> **Status:** Early development — Sprint 0 complete, repository initialised, governance established.  
> Current sprint: **Sprint 3 — Professional README & Project Identity**

---

## Project Identity

- **Project Name:** CYRE (Cybersecurity Reality Engine)
- **Owner:** ForgeX4 / Kian M.J.
- **Repository:** [sirkianmj/Forgex4-CYRE](https://github.com/sirkianmj/Forgex4-CYRE)
- **License:** Proprietary — All rights reserved
- **Primary Language:** TypeScript
- **Domain:** Cybersecurity simulation, serious games, education, research

---

## Vision

CYRE makes cybersecurity itself a first-class engine concept.

It is **not** a general-purpose game engine; it is a specialised platform for cyber simulation, education, training, and research.

The engine powers a flagship cybersecurity investigation and strategy game where players assume roles such as SOC analyst, incident responder, threat hunter, or security engineer.

---

## Core Objectives

1. **Simulation First** — The underlying cyber world maintains real state; actions change the simulation.
2. **Domain-Specific by Design** — Cybersecurity concepts are native engine primitives, not bolted-on mechanics.
3. **Rendering Independent** — The same scenario can be displayed as 2D, 2.5D, or 3D without changing the simulation.
4. **Cross-Platform** — Games built on CYRE deploy to web, iOS, Android, desktop, and potentially consoles.
5. **Research-Grade** — Deterministic scenarios, telemetry, and reproducibility enable academic research.

---

## Monorepo Structure
CYRE
├── engine # Core engine code (TypeScript)
├── game # Flagship game implementation
├── tools # Editor, CLI, and developer tools
├── research # Research scripts, notebooks, analytics
├── docs # Documentation
└── experiments # Experimental prototypes and spikes

text

---

## Technology Direction

- **Core:** TypeScript
- **Frontend / UI:** React + TypeScript
- **Rendering:** WebGL/WebGPU-compatible, initial 2D focus
- **Backend:** Node.js + TypeScript
- **Packaging:** Cross-platform wrapper (mobile/desktop)
- **Database:** PostgreSQL (future)
- **Automation:** REST / WebSockets / Webhooks → n8n

---

## Roadmap

CYRE follows a 40-sprint roadmap from environment setup to v1.0 release.

See [docs/roadmap.md](docs/roadmap.md) for the full plan.

---

## Current Development Status

- [x] Sprint 0: Development Environment
- [x] Sprint 1: GitHub Repository
- [x] Sprint 2: Ownership, License & Governance
- [ ] Sprint 3: Professional README & Project Identity (current)

---

## Ownership & Licensing

CYRE is proprietary software owned by **ForgeX4 / Kian M.J.**  
All rights reserved. See [LICENSE](LICENSE) and [OWNERSHIP.md](OWNERSHIP.md) for details.

Third-party notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).  
Project governance is described in [GOVERNANCE.md](GOVERNANCE.md).

---

## Development

### Prerequisites

- macOS with Xcode Command Line Tools
- Homebrew
- Git
- GitHub CLI
- Node.js LTS
- pnpm
- Miniforge (Conda) with `cyre-research` environment

### Setup

```bash
# Clone repository
git clone <repo-url>
cd CYRE

# Install dependencies (future sprints)
pnpm install
Research Goals

CYRE is designed as a research platform for experimentally studying:

Procedural cybersecurity scenario generation
Adaptive cyber training
Human decision-making in simulated cyber environments
AI agents in cyber defense/attack
Cybersecurity education effectiveness
The engine records structured telemetry for reproducible experiments.

Contribution Policy

Contributions are currently closed while the project is in early private development.
When public contribution opens, contributors will be required to sign a Contributor License Agreement (CLA).
See CONTRIBUTING.md for details.

Screenshots

No screenshots available yet. Placeholder directory: docs/screenshots/

Contact

For inquiries, contact ForgeX4 (contact information will be provided separately).

License

This project is proprietary. All rights reserved.
See LICENSE for details.
