import { describe, it, expect } from 'vitest';
import { FixedStepper } from '../src/physics/FixedStepper';

describe('FixedStepper', () => {
  it('produces two fixed steps per 60fps frame', () => {
    const s = new FixedStepper(1 / 120, 0.25, 12);
    s.advance(0);
    expect(s.advance(1 / 60)).toBe(2);
  });

  it('clamps huge frame deltas to maxSteps and drops the backlog', () => {
    const s = new FixedStepper(1 / 120, 0.25, 12);
    s.advance(0);
    expect(s.advance(10)).toBe(12); // 30 steps requested, capped to 12
    expect(s.alpha).toBe(0); // backlog dropped after tab suspension
  });
});
