# CYRE — Cybersecurity Reality Engine

**Domain-Specific Game & Simulation Engine for Cybersecurity**

CYRE is a modular, extensible, domain-specific game and simulation engine designed specifically for building high-quality interactive cybersecurity games and cyber-simulation applications.

> **Status:** Early development — Sprint 0 environment complete, repository initialised.

---

## Vision

CYRE makes cybersecurity itself a first-class engine concept.  
It is **not** a general-purpose game engine; it is a specialised platform for cyber simulation, education, training, and research.

The engine powers a flagship cybersecurity investigation and strategy game where players assume roles such as SOC analyst, incident responder, threat hunter, or security engineer.

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
Current progress: **Sprint 0 ✅, Sprint 1 in progress**.

See `docs/roadmap.md` for the full plan.

---

## Ownership

© 2026 ForgeX4 / Kian M.J. All rights reserved.  
Proprietary project — see `LICENSE` for terms.

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
License

This project is proprietary. All rights reserved.
See LICENSE for details.

---

## Ownership & Governance

CYRE is proprietary software owned by **ForgeX4 / Kian M.J.**  
See [OWNERSHIP.md](OWNERSHIP.md) for licensing details.  
Third-party licenses are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).  
Project governance is described in [GOVERNANCE.md](GOVERNANCE.md).
