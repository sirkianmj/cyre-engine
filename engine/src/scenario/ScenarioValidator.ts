/**
 * ScenarioValidator
 * ------------------
 * Validates a scenario definition for logical consistency.
 * Checks network connectivity, attack path reachability, references,
 * and resource dependencies.
 *
 * Returns a ValidationResult with errors and warnings.
 */

import type { Scenario as ScenarioData } from './ScenarioTypes.js';
import { ValidationResult, createValidationResult } from './ValidationResult.js';

export class ScenarioValidator {
  validate(data: ScenarioData): ValidationResult {
    const result = createValidationResult();

    this.validateNetwork(data, result);
    this.validateAttackPath(data, result);
    this.validateEvidence(data, result);
    this.validateTimeline(data, result);
    this.validateObjectives(data, result);
    this.validateReferences(data, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateNetwork(data: ScenarioData, result: ValidationResult): void {
    const nodeIds = new Set(data.network.nodes.map((n) => n.id));
    for (const edge of data.network.edges) {
      if (!nodeIds.has(edge.source)) {
        result.errors.push(`Network edge source "${edge.source}" does not reference an existing node.`);
      }
      if (!nodeIds.has(edge.target)) {
        result.errors.push(`Network edge target "${edge.target}" does not reference an existing node.`);
      }
      if (edge.source === edge.target) {
        result.errors.push(`Network self-loop detected at node "${edge.source}".`);
      }
    }

    // Check duplicate node ids
    const seen = new Set<string>();
    for (const node of data.network.nodes) {
      if (seen.has(node.id)) {
        result.errors.push(`Duplicate network node id "${node.id}".`);
      }
      seen.add(node.id);
    }
  }

  private validateAttackPath(data: ScenarioData, result: ValidationResult): void {
    const { attackPath, network } = data;
    if (!attackPath) {
      result.errors.push('Attack path is missing.');
      return;
    }
    if (!network.nodes.some((n) => n.id === attackPath.source)) {
      result.errors.push(`Attack path source "${attackPath.source}" does not exist in network nodes.`);
    }
    if (!network.nodes.some((n) => n.id === attackPath.target)) {
      result.errors.push(`Attack path target "${attackPath.target}" does not exist in network nodes.`);
    }
    if (attackPath.path.length < 2) {
      result.errors.push('Attack path must contain at least two nodes.');
      return;
    }
    if (attackPath.path[0] !== attackPath.source) {
      result.errors.push('Attack path first node must match source.');
    }
    if (attackPath.path[attackPath.path.length - 1] !== attackPath.target) {
      result.errors.push('Attack path last node must match target.');
    }
    // Check that each consecutive pair has an edge in network (undirected check)
    const edgeExists = (from: string, to: string) =>
      network.edges.some(
        (edge) =>
          (edge.source === from && edge.target === to) ||
          (edge.source === to && edge.target === from),
      );
    for (let i = 0; i < attackPath.path.length - 1; i++) {
      const from = attackPath.path[i];
      const to = attackPath.path[i + 1];
      if (!edgeExists(from, to)) {
        result.errors.push(`Attack path edge from "${from}" to "${to}" does not exist in network.`);
      }
    }
  }

  private validateEvidence(data: ScenarioData, result: ValidationResult): void {
    const nodeIds = new Set(data.network.nodes.map((n) => n.id));
    const assetIds = new Set(data.assets.map((a) => a.id));
    const userIds = new Set(data.users.map((u) => u.id));
    for (const evidence of data.evidence) {
      if (!evidence.id || evidence.id.trim() === '') {
        result.errors.push('Evidence id cannot be empty.');
      }
      if (!evidence.type || evidence.type.trim() === '') {
        result.errors.push(`Evidence "${evidence.id}" type cannot be empty.`);
      }
      if (!evidence.title || evidence.title.trim() === '') {
        result.errors.push(`Evidence "${evidence.id}" title cannot be empty.`);
      }
      if (!evidence.description || evidence.description.trim() === '') {
        result.errors.push(`Evidence "${evidence.id}" description cannot be empty.`);
      }
      if (evidence.timestamp !== undefined && evidence.timestamp < 0) {
        result.errors.push(`Evidence "${evidence.id}" timestamp cannot be negative.`);
      }
      if (evidence.sourceId !== undefined) {
        if (!nodeIds.has(evidence.sourceId) && !assetIds.has(evidence.sourceId) && !userIds.has(evidence.sourceId)) {
          result.warnings.push(
            `Evidence "${evidence.id}" sourceId "${evidence.sourceId}" does not match any known entity.`,
          );
        }
      }
    }
  }

  private validateTimeline(data: ScenarioData, result: ValidationResult): void {
    const nodeIds = new Set(data.network.nodes.map((n) => n.id));
    const assetIds = new Set(data.assets.map((a) => a.id));
    const userIds = new Set(data.users.map((u) => u.id));
    for (const event of data.timeline) {
      if (!event.id || event.id.trim() === '') {
        result.errors.push('Timeline event id cannot be empty.');
      }
      if (!event.type || event.type.trim() === '') {
        result.errors.push(`Timeline event "${event.id}" type cannot be empty.`);
      }
      if (!Number.isInteger(event.timestamp) || event.timestamp < 0) {
        result.errors.push(`Timeline event "${event.id}" timestamp must be a non-negative integer.`);
      }
      if (event.sourceId !== undefined && !nodeIds.has(event.sourceId) && !assetIds.has(event.sourceId) && !userIds.has(event.sourceId)) {
        result.warnings.push(
          `Timeline event "${event.id}" sourceId "${event.sourceId}" does not match any known entity.`,
        );
      }
      if (event.targetId !== undefined && !nodeIds.has(event.targetId) && !assetIds.has(event.targetId) && !userIds.has(event.targetId)) {
        result.warnings.push(
          `Timeline event "${event.id}" targetId "${event.targetId}" does not match any known entity.`,
        );
      }
    }
  }

  private validateObjectives(data: ScenarioData, result: ValidationResult): void {
    for (const objective of data.objectives) {
      if (!objective.id || objective.id.trim() === '') {
        result.errors.push('Objective id cannot be empty.');
      }
      if (!objective.description || objective.description.trim() === '') {
        result.errors.push(`Objective "${objective.id}" description cannot be empty.`);
      }
    }
  }

  private validateReferences(data: ScenarioData, result: ValidationResult): void {
    // Check that asset IDs are unique (already done in Scenario, but for safety)
    const assetIds = new Set<string>();
    for (const asset of data.assets) {
      if (assetIds.has(asset.id)) {
        result.errors.push(`Duplicate asset id "${asset.id}".`);
      }
      assetIds.add(asset.id);
    }
    // Check user IDs unique
    const userIds = new Set<string>();
    for (const user of data.users) {
      if (userIds.has(user.id)) {
        result.errors.push(`Duplicate user id "${user.id}".`);
      }
      userIds.add(user.id);
    }
    // Check attacker id present
    if (!data.attacker || data.attacker.id.trim() === '') {
      result.errors.push('Attacker id cannot be empty.');
    }
    // Check timeLimitMs positive if present
    if (data.timeLimitMs !== undefined && data.timeLimitMs <= 0) {
      result.errors.push('timeLimitMs must be positive if provided.');
    }
  }
}
