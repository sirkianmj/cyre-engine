import { describe, it, expect } from 'vitest';
import {
  AttackStage,
  AttackState,
  ATTACK_STAGE_ORDER,
  getNextStage,
  isStageReached,
} from '../index.js';

describe('AttackStage order', () => {
  it('defines 12 stages', () => {
    expect(ATTACK_STAGE_ORDER).toHaveLength(12);
  });

  it('returns next stage for non-final stage', () => {
    expect(getNextStage(AttackStage.Recon)).toBe(AttackStage.InitialAccess);
    expect(getNextStage(AttackStage.InitialAccess)).toBe(AttackStage.Execution);
  });

  it('returns null for final stage', () => {
    expect(getNextStage(AttackStage.Impact)).toBeNull();
  });

  it('checks stage reached', () => {
    expect(isStageReached(AttackStage.Execution, AttackStage.Recon)).toBe(true);
    expect(isStageReached(AttackStage.Recon, AttackStage.Execution)).toBe(false);
  });
});

describe('AttackState', () => {
  it('starts at Recon by default', () => {
    const state = new AttackState();
    expect(state.getCurrentStage()).toBe(AttackStage.Recon);
  });

  it('advances through stages in order', () => {
    const state = new AttackState();
    const transition1 = state.advance(100);
    expect(transition1.from).toBe(AttackStage.Recon);
    expect(transition1.to).toBe(AttackStage.InitialAccess);
    expect(state.getCurrentStage()).toBe(AttackStage.InitialAccess);

    const transition2 = state.advance(200);
    expect(transition2.from).toBe(AttackStage.InitialAccess);
    expect(transition2.to).toBe(AttackStage.Execution);
    expect(state.getCurrentStage()).toBe(AttackStage.Execution);
    expect(state.getHistory()).toHaveLength(2);
  });

  it('throws when advancing beyond final stage', () => {
    const state = new AttackState(AttackStage.Impact);
    expect(() => state.advance(100)).toThrow(/Cannot advance beyond the final stage/);
  });

  it('allows jumping forward to a later stage', () => {
    const state = new AttackState();
    const transition = state.setStage(AttackStage.PrivilegeEscalation, 500);
    expect(transition.to).toBe(AttackStage.PrivilegeEscalation);
    expect(state.getCurrentStage()).toBe(AttackStage.PrivilegeEscalation);
  });

  it('throws when jumping backward', () => {
    const state = new AttackState(AttackStage.Discovery);
    expect(() => state.setStage(AttackStage.Recon)).toThrow(/Cannot move backwards/);
  });

  it('throws when jumping to same stage', () => {
    const state = new AttackState(AttackStage.Discovery);
    expect(() => state.setStage(AttackStage.Discovery)).toThrow(/Cannot move backwards or to the same stage/);
  });

  it('checks hasReached correctly', () => {
    const state = new AttackState(AttackStage.LateralMovement);
    expect(state.hasReached(AttackStage.Recon)).toBe(true);
    expect(state.hasReached(AttackStage.LateralMovement)).toBe(true);
    expect(state.hasReached(AttackStage.Exfiltration)).toBe(false);
  });

  it('resets to a given stage and clears history', () => {
    const state = new AttackState(AttackStage.Recon);
    state.advance(100);
    state.advance(200);
    state.reset(AttackStage.InitialAccess);
    expect(state.getCurrentStage()).toBe(AttackStage.InitialAccess);
    expect(state.getHistory()).toHaveLength(0);
  });

  it('serialises to JSON', () => {
    const state = new AttackState(AttackStage.Recon);
    state.advance(100);
    const json = state.toJSON();
    expect(json.currentStage).toBe(AttackStage.InitialAccess);
    expect(Array.isArray(json.history)).toBe(true);
    expect((json.history as unknown[]).length).toBe(1);
  });
});
