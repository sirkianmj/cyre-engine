# CYRE Public API Reference

Engine version: `1.0.0`
Public API version: `1`

## Modules

| Module | Version | Exported Symbols |
| --- | --- | --- |
| `analytics` | 1 | TelemetryExporter, TelemetryRecorder |
| `automation` | 1 | API_METHODS, ApiGateway, AutomationServer, CYRE_EVENT_TYPES, N8nIntegration, N8nIntegrationManager, WebSocketEventStream, WebhookClient, WebhookRegistry, WebhookSystem, isApiMethod, isCyreEventType |
| `core` | 1 | BaseModule, Configuration, CyreError, Engine, Entity, ErrorHandler, EventBus, Logger, ManualClock, ModuleManager, StateContainer, SystemClock |
| `cyber` | 1 | ALL_DEFENSIVE_ACTIONS, ATTACK_STAGE_ORDER, AccessControl, Account, AttackStage, AttackState, Client, CyberEntity, Database, DefenseState, DefensiveAction, Firewall, Host, NetworkGraph, Privilege, Role, Router, Server, Service, Session, User, Vulnerability, VulnerabilityCatalog, getNextStage, isDefensiveAction, isStageReached, validateOptionalHostname, validateOptionalIpAddress |
| `debug` | 1 | CyreDebugger, DebugBreakpoint, DebugInspector, PERFORMANCE_AUDIT_CATEGORIES, PERFORMANCE_AUDIT_SEVERITIES, PerformanceAuditSystem, PerformanceProfiler, ResourceDiagnostics, SECURITY_AUDIT_CATEGORIES, SECURITY_AUDIT_SEVERITIES, SecurityAuditSystem, createDebugEventRecord, isPerformanceAuditCategory, isPerformanceAuditSeverity, isSecurityAuditCategory, isSecurityAuditSeverity |
| `editor` | 1 | AttackGraphEditor, CYBER_ENTITY_PALETTE_ITEMS, CommandPalette, CyberEntityPalette, DockManager, EditorShell, EventTriggerSystem, EvidenceGraphEditor, Inspector, MissionDesigner, MultiSelectionManager, NetworkGraphEditor, ObjectiveGraphEditor, PREDEFINED_WORKSPACES, ProjectExplorer, ShortcutManager, TimelineEditor, WorkspaceManager |
| `game` | 1 | ACCESSIBILITY_TARGETS, ALL_EVIDENCE_TYPES, ART_DIRECTION_STYLES, AdaptiveDifficultyController, AdaptiveScenarioEngine, Alert, AlertStatus, AttackGraph, AutonomousAttackerAgent, AutonomousDefenderAgent, BaseCyberAgent, COOPERATIVE_SOC_ROLES, CYBER_AGENT_ROLES, CYBER_AGENT_STATUSES, Campaign, CooperativeSocManager, CooperativeSocSession, CyberAgentRegistry, CyrePluginContextImpl, CyrePluginManager, CyrePluginRegistry, CyrePluginSystem, CyreScript, CyreScriptBuilder, CyreScriptEngine, CyreScriptRegistry, DEFAULT_SCORING_WEIGHTS, DIFFICULTY_SETTINGS, Difficulty, DifficultyManager, DifficultyProfile, EvidenceCollection, EvidenceType, GAME_PILLAR_CATEGORIES, GAME_TARGET_PLATFORMS, GameIdentity, GameIdentityRegistry, Hypothesis, InvestigationPhase, InvestigationState, LiveEventStream, LiveSimulationInspector, MISSION_001_CONSTANTS, MULTIPLAYER_CONNECTION_STATES, MULTIPLAYER_MODES, MULTIPLAYER_PLAYER_ROLES, MULTIPLAYER_STATES, Mission, Mission001Runner, MissionFactory, MissionRunner, MissionStatus, MultiplayerSession, MultiplayerSessionManager, NARRATIVE_TONES, PLAYER_ROLES, PROGRESSION_STYLES, PlayModeController, PlayerProgression, RED_VS_BLUE_PLAYER_ROLES, RED_VS_BLUE_TEAMS, RedVsBlueManager, RedVsBlueSession, ScoreCalculator, createEvidence, createMission001Scenario, createMission002Scenario, createMission003Scenario, createMission004Scenario, createMission005Scenario, createObjective, isAccessibilityTarget, isArtDirectionStyle, isCooperativeSocRole, isCyberAgentRole, isCyberAgentStatus, isEvidenceType, isGamePillarCategory, isGameTargetPlatform, isMultiplayerConnectionState, isMultiplayerMode, isMultiplayerPlayerRole, isMultiplayerSessionState, isNarrativeTone, isPlayerRole, isProgressionStyle, isRedVsBluePlayerRole, isRedVsBlueTeam, xpRequiredForLevel |
| `platform` | 1 | AUDIO_CHANNELS, AUDIO_CLIP_KINDS, AUDIO_EVENT_TYPES, AUDIO_PLAYBACK_STATES, AudioClipDescriptor, AudioMixer, AudioSystem, BUILD_FLAVORS, BUILD_TARGETS, BuildArtifact, BuildPipeline, BuildProfile, COMPATIBILITY_AUDIT_CATEGORIES, COMPATIBILITY_AUDIT_SEVERITIES, CONSOLE_FAMILIES, CONSOLE_INPUT_ABSTRACTIONS, CONSOLE_RENDERING_ABSTRACTIONS, CONSOLE_SAVE_SYSTEMS, CONSOLE_SERVICES, CompatibilityAuditSystem, ConsoleArchitecture, ConsoleArchitectureProfile, ConsolePlatformAdapter, DESKTOP_PLATFORMS, DesktopApp, DesktopPackage, DesktopPackager, DesktopPlatformAdapter, FileStorageAdapter, GamepadInputAdapter, MOBILE_PLATFORMS, MemoryStorageAdapter, MobilePackage, MobilePackager, MobilePlatformAdapter, PERFORMANCE_SETTINGS, PerformanceProfile, ResolutionSettings, TouchInputAdapter, WebPackage, WebPackager, isAudioChannel, isAudioClipKind, isAudioEventType, isAudioPlaybackState, isBuildFlavor, isBuildTarget, isCompatibilityAuditCategory, isCompatibilityAuditSeverity, isConsoleFamily, isConsoleInputAbstraction, isConsoleRenderingAbstraction, isConsoleSaveSystem, isConsoleService, isDesktopPlatform, isMobilePlatform |
| `project` | 1 | PROJECT_TEMPLATES, ProjectCreator, ProjectManager, ProjectModel |
| `replay` | 1 | ReplayPlayer, ReplayRecorder, ReplayStudio |
| `research` | 1 | EXPERIMENTAL_ASSIGNMENT_METHODS, EXPERIMENTAL_INTERVENTIONS, ExperimentRunner, ExperimentalScenarioFramework, REPRODUCIBILITY_SCHEMA_VERSION, RESEARCH_EXPORT_FORMATS, ReproducibilityManager, ResearchDashboard, ResearchDataset, ResearchDatasetExporter, computeReproducibilityChecksum, isExperimentalAssignmentMethod, isExperimentalIntervention, isResearchExportFormat, stableStringify |
| `scenario` | 1 | ScenarioDefinition, ScenarioEditor, ScenarioGenerator, ScenarioLoader, ScenarioRegistry, ScenarioValidator, createValidationResult |
| `scene` | 1 | SceneEditor, SceneModel, SceneRegistry |
| `serialization` | 1 | CyreSerializer, ProjectSerializer, ScenarioSerializer, SchemaRegistry |
| `timeline` | 1 | Timeline |
| `ui` | 1 | AccessibilityController, AccessibilitySettings, AlertListUI, DashboardUI, DesignSystem, EvidencePanelUI, FeedbackSystem, GAME_UI_ALERT_SEVERITIES, GAME_UI_ALERT_STATUSES, GAME_UI_MISSION_STATUSES, GameUIWorkspace, InvestigationTimelineUI, MOTION_PRESETS, MissionStatusUI, MotionSystem, OnboardingManager, TerminalUI, UIComponent, UIComponentRegistry, UIRenderer, UIThemeManager, UX_AUDIT_CATEGORIES, UX_AUDIT_SEVERITIES, UxAuditSystem, VISUAL_DESIGN_AUDIT_CATEGORIES, VISUAL_INTENSITIES, VISUAL_MOTION_PRESETS, VisualDesignAuditSystem, VisualPolishProfile, VisualPolishSystem, isGameUIAlertSeverity, isGameUIAlertStatus, isGameUIMissionStatus, isUxAuditCategory, isUxAuditSeverity, isVisualDesignAuditCategory, isVisualIntensity, isVisualMotionPreset, normalizeAuditSeverity |

## Module API

### analytics

Telemetry event recording and export.

Exported symbols:

- `TelemetryExporter`
- `TelemetryRecorder`

### automation

REST API, webhooks, WebSockets, n8n, and automation integration.

Exported symbols:

- `API_METHODS`
- `ApiGateway`
- `AutomationServer`
- `CYRE_EVENT_TYPES`
- `N8nIntegration`
- `N8nIntegrationManager`
- `WebSocketEventStream`
- `WebhookClient`
- `WebhookRegistry`
- `WebhookSystem`
- `isApiMethod`
- `isCyreEventType`

### core

Core engine lifecycle, configuration, logging, modules, entities, events, state, and clocks.

Exported symbols:

- `BaseModule`
- `Configuration`
- `CyreError`
- `Engine`
- `Entity`
- `ErrorHandler`
- `EventBus`
- `Logger`
- `ManualClock`
- `ModuleManager`
- `StateContainer`
- `SystemClock`

### cyber

Cybersecurity simulation entities, network graphs, identity, permissions, vulnerabilities, attack and defense models.

Exported symbols:

- `ALL_DEFENSIVE_ACTIONS`
- `ATTACK_STAGE_ORDER`
- `AccessControl`
- `Account`
- `AttackStage`
- `AttackState`
- `Client`
- `CyberEntity`
- `Database`
- `DefenseState`
- `DefensiveAction`
- `Firewall`
- `Host`
- `NetworkGraph`
- `Privilege`
- `Role`
- `Router`
- `Server`
- `Service`
- `Session`
- `User`
- `Vulnerability`
- `VulnerabilityCatalog`
- `getNextStage`
- `isDefensiveAction`
- `isStageReached`
- `validateOptionalHostname`
- `validateOptionalIpAddress`

### debug

Debugger, inspector, profiling, diagnostics, and audit tooling.

Exported symbols:

- `CyreDebugger`
- `DebugBreakpoint`
- `DebugInspector`
- `PERFORMANCE_AUDIT_CATEGORIES`
- `PERFORMANCE_AUDIT_SEVERITIES`
- `PerformanceAuditSystem`
- `PerformanceProfiler`
- `ResourceDiagnostics`
- `SECURITY_AUDIT_CATEGORIES`
- `SECURITY_AUDIT_SEVERITIES`
- `SecurityAuditSystem`
- `createDebugEventRecord`
- `isPerformanceAuditCategory`
- `isPerformanceAuditSeverity`
- `isSecurityAuditCategory`
- `isSecurityAuditSeverity`

### editor

Professional CYRE editor domain models, docking, inspectors, palettes, and graph editors.

Exported symbols:

- `AttackGraphEditor`
- `CYBER_ENTITY_PALETTE_ITEMS`
- `CommandPalette`
- `CyberEntityPalette`
- `DockManager`
- `EditorShell`
- `EventTriggerSystem`
- `EvidenceGraphEditor`
- `Inspector`
- `MissionDesigner`
- `MultiSelectionManager`
- `NetworkGraphEditor`
- `ObjectiveGraphEditor`
- `PREDEFINED_WORKSPACES`
- `ProjectExplorer`
- `ShortcutManager`
- `TimelineEditor`
- `WorkspaceManager`

### game

Gameplay systems, missions, evidence, investigation, progression, scripting, plugins, agents, difficulty, and multiplayer.

Exported symbols:

- `ACCESSIBILITY_TARGETS`
- `ALL_EVIDENCE_TYPES`
- `ART_DIRECTION_STYLES`
- `AdaptiveDifficultyController`
- `AdaptiveScenarioEngine`
- `Alert`
- `AlertStatus`
- `AttackGraph`
- `AutonomousAttackerAgent`
- `AutonomousDefenderAgent`
- `BaseCyberAgent`
- `COOPERATIVE_SOC_ROLES`
- `CYBER_AGENT_ROLES`
- `CYBER_AGENT_STATUSES`
- `Campaign`
- `CooperativeSocManager`
- `CooperativeSocSession`
- `CyberAgentRegistry`
- `CyrePluginContextImpl`
- `CyrePluginManager`
- `CyrePluginRegistry`
- `CyrePluginSystem`
- `CyreScript`
- `CyreScriptBuilder`
- `CyreScriptEngine`
- `CyreScriptRegistry`
- `DEFAULT_SCORING_WEIGHTS`
- `DIFFICULTY_SETTINGS`
- `Difficulty`
- `DifficultyManager`
- `DifficultyProfile`
- `EvidenceCollection`
- `EvidenceType`
- `GAME_PILLAR_CATEGORIES`
- `GAME_TARGET_PLATFORMS`
- `GameIdentity`
- `GameIdentityRegistry`
- `Hypothesis`
- `InvestigationPhase`
- `InvestigationState`
- `LiveEventStream`
- `LiveSimulationInspector`
- `MISSION_001_CONSTANTS`
- `MULTIPLAYER_CONNECTION_STATES`
- `MULTIPLAYER_MODES`
- `MULTIPLAYER_PLAYER_ROLES`
- `MULTIPLAYER_STATES`
- `Mission`
- `Mission001Runner`
- `MissionFactory`
- `MissionRunner`
- `MissionStatus`
- `MultiplayerSession`
- `MultiplayerSessionManager`
- `NARRATIVE_TONES`
- `PLAYER_ROLES`
- `PROGRESSION_STYLES`
- `PlayModeController`
- `PlayerProgression`
- `RED_VS_BLUE_PLAYER_ROLES`
- `RED_VS_BLUE_TEAMS`
- `RedVsBlueManager`
- `RedVsBlueSession`
- `ScoreCalculator`
- `createEvidence`
- `createMission001Scenario`
- `createMission002Scenario`
- `createMission003Scenario`
- `createMission004Scenario`
- `createMission005Scenario`
- `createObjective`
- `isAccessibilityTarget`
- `isArtDirectionStyle`
- `isCooperativeSocRole`
- `isCyberAgentRole`
- `isCyberAgentStatus`
- `isEvidenceType`
- `isGamePillarCategory`
- `isGameTargetPlatform`
- `isMultiplayerConnectionState`
- `isMultiplayerMode`
- `isMultiplayerPlayerRole`
- `isMultiplayerSessionState`
- `isNarrativeTone`
- `isPlayerRole`
- `isProgressionStyle`
- `isRedVsBluePlayerRole`
- `isRedVsBlueTeam`
- `xpRequiredForLevel`

### platform

Platform adapters, input, packaging, console architecture, audio, and compatibility audit.

Exported symbols:

- `AUDIO_CHANNELS`
- `AUDIO_CLIP_KINDS`
- `AUDIO_EVENT_TYPES`
- `AUDIO_PLAYBACK_STATES`
- `AudioClipDescriptor`
- `AudioMixer`
- `AudioSystem`
- `BUILD_FLAVORS`
- `BUILD_TARGETS`
- `BuildArtifact`
- `BuildPipeline`
- `BuildProfile`
- `COMPATIBILITY_AUDIT_CATEGORIES`
- `COMPATIBILITY_AUDIT_SEVERITIES`
- `CONSOLE_FAMILIES`
- `CONSOLE_INPUT_ABSTRACTIONS`
- `CONSOLE_RENDERING_ABSTRACTIONS`
- `CONSOLE_SAVE_SYSTEMS`
- `CONSOLE_SERVICES`
- `CompatibilityAuditSystem`
- `ConsoleArchitecture`
- `ConsoleArchitectureProfile`
- `ConsolePlatformAdapter`
- `DESKTOP_PLATFORMS`
- `DesktopApp`
- `DesktopPackage`
- `DesktopPackager`
- `DesktopPlatformAdapter`
- `FileStorageAdapter`
- `GamepadInputAdapter`
- `MOBILE_PLATFORMS`
- `MemoryStorageAdapter`
- `MobilePackage`
- `MobilePackager`
- `MobilePlatformAdapter`
- `PERFORMANCE_SETTINGS`
- `PerformanceProfile`
- `ResolutionSettings`
- `TouchInputAdapter`
- `WebPackage`
- `WebPackager`
- `isAudioChannel`
- `isAudioClipKind`
- `isAudioEventType`
- `isAudioPlaybackState`
- `isBuildFlavor`
- `isBuildTarget`
- `isCompatibilityAuditCategory`
- `isCompatibilityAuditSeverity`
- `isConsoleFamily`
- `isConsoleInputAbstraction`
- `isConsoleRenderingAbstraction`
- `isConsoleSaveSystem`
- `isConsoleService`
- `isDesktopPlatform`
- `isMobilePlatform`

### project

CYRE project model, templates, and lifecycle management.

Exported symbols:

- `PROJECT_TEMPLATES`
- `ProjectCreator`
- `ProjectManager`
- `ProjectModel`

### replay

Simulation replay recording and playback.

Exported symbols:

- `ReplayPlayer`
- `ReplayRecorder`
- `ReplayStudio`

### research

Research datasets, experimental scenario framework, reproducibility, and dashboards.

Exported symbols:

- `EXPERIMENTAL_ASSIGNMENT_METHODS`
- `EXPERIMENTAL_INTERVENTIONS`
- `ExperimentRunner`
- `ExperimentalScenarioFramework`
- `REPRODUCIBILITY_SCHEMA_VERSION`
- `RESEARCH_EXPORT_FORMATS`
- `ReproducibilityManager`
- `ResearchDashboard`
- `ResearchDataset`
- `ResearchDatasetExporter`
- `computeReproducibilityChecksum`
- `isExperimentalAssignmentMethod`
- `isExperimentalIntervention`
- `isResearchExportFormat`
- `stableStringify`

### scenario

Scenario representation, loading, validation, registry, editor, and procedural generation.

Exported symbols:

- `ScenarioDefinition`
- `ScenarioEditor`
- `ScenarioGenerator`
- `ScenarioLoader`
- `ScenarioRegistry`
- `ScenarioValidator`
- `createValidationResult`

### scene

Scene model, registry, and editing support.

Exported symbols:

- `SceneEditor`
- `SceneModel`
- `SceneRegistry`

### serialization

Project, scenario, and schema serialization primitives.

Exported symbols:

- `CyreSerializer`
- `ProjectSerializer`
- `ScenarioSerializer`
- `SchemaRegistry`

### timeline

Event timeline storage and querying.

Exported symbols:

- `Timeline`

### ui

UI components, themes, design system, motion, game UI, visual polish, and UX audits.

Exported symbols:

- `AccessibilityController`
- `AccessibilitySettings`
- `AlertListUI`
- `DashboardUI`
- `DesignSystem`
- `EvidencePanelUI`
- `FeedbackSystem`
- `GAME_UI_ALERT_SEVERITIES`
- `GAME_UI_ALERT_STATUSES`
- `GAME_UI_MISSION_STATUSES`
- `GameUIWorkspace`
- `InvestigationTimelineUI`
- `MOTION_PRESETS`
- `MissionStatusUI`
- `MotionSystem`
- `OnboardingManager`
- `TerminalUI`
- `UIComponent`
- `UIComponentRegistry`
- `UIRenderer`
- `UIThemeManager`
- `UX_AUDIT_CATEGORIES`
- `UX_AUDIT_SEVERITIES`
- `UxAuditSystem`
- `VISUAL_DESIGN_AUDIT_CATEGORIES`
- `VISUAL_INTENSITIES`
- `VISUAL_MOTION_PRESETS`
- `VisualDesignAuditSystem`
- `VisualPolishProfile`
- `VisualPolishSystem`
- `isGameUIAlertSeverity`
- `isGameUIAlertStatus`
- `isGameUIMissionStatus`
- `isUxAuditCategory`
- `isUxAuditSeverity`
- `isVisualDesignAuditCategory`
- `isVisualIntensity`
- `isVisualMotionPreset`
- `normalizeAuditSeverity`
