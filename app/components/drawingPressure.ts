type PressureSample = {
  pointerType: string;
  pressure: number;
};

type StrokeWidthInput = PressureSample & {
  baseSize: number;
  strokeScale: number;
};

const MIN_PRESSURE_FACTOR = 0.35;

function getPressureFactor({ pointerType, pressure }: PressureSample) {
  if (pointerType !== 'pen' || !Number.isFinite(pressure) || pressure <= 0) {
    return 1;
  }

  const clampedPressure = Math.min(Math.max(pressure, 0), 1);
  return MIN_PRESSURE_FACTOR + (1 - MIN_PRESSURE_FACTOR) * clampedPressure;
}

export function getStrokeWidth({
  baseSize,
  strokeScale,
  pointerType,
  pressure
}: StrokeWidthInput) {
  return baseSize * strokeScale * getPressureFactor({ pointerType, pressure });
}
