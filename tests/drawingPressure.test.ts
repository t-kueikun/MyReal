import { describe, expect, it } from 'vitest';
import { getStrokeWidth } from '../app/components/drawingPressure';

describe('drawingPressure', () => {
  it('keeps the current fixed width for mouse input', () => {
    expect(getStrokeWidth({
      baseSize: 6,
      strokeScale: 2,
      pointerType: 'mouse',
      pressure: 0.5
    })).toBe(12);
  });

  it('scales pen strokes based on pressure', () => {
    expect(getStrokeWidth({
      baseSize: 6,
      strokeScale: 2,
      pointerType: 'pen',
      pressure: 0.5
    })).toBeCloseTo(8.1);
  });

  it('falls back to the fixed width when pen pressure is unavailable', () => {
    expect(getStrokeWidth({
      baseSize: 6,
      strokeScale: 2,
      pointerType: 'pen',
      pressure: 0
    })).toBe(12);
  });

  it('clamps pen pressure to the supported range', () => {
    expect(getStrokeWidth({
      baseSize: 6,
      strokeScale: 2,
      pointerType: 'pen',
      pressure: 2
    })).toBe(12);
  });
});
