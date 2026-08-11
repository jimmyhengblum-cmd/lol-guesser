import { describe, it, expect } from 'vitest';

import { guessRoundPoints, qcmPoints, MIN_POINTS, ROUND_BASE } from './scoring';

describe('guessRoundPoints', () => {
  it('awards full points for a first-try solve', () => {
    expect(guessRoundPoints(0, true)).toBe(ROUND_BASE);
  });
  it('subtracts a penalty per wrong guess', () => {
    expect(guessRoundPoints(2, true)).toBe(ROUND_BASE - 40);
  });
  it('never drops below the floor when solved', () => {
    expect(guessRoundPoints(10, true)).toBe(MIN_POINTS);
  });
  it('awards zero when not solved', () => {
    expect(guessRoundPoints(1, false)).toBe(0);
  });
});

describe('qcmPoints', () => {
  it('scores 20 per correct answer', () => {
    expect(qcmPoints(0)).toBe(0);
    expect(qcmPoints(3)).toBe(60);
    expect(qcmPoints(5)).toBe(100);
  });
});
