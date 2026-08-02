import { aggregateVolume } from './volume.util';

describe('volume.util - aggregateVolume', () => {
  it('sums actual and target across records and flags under-target when actual is significantly below target', () => {
    const result = aggregateVolume([
      { weightKg: 40, targetWeightKg: 95 },
      { weightKg: 30, targetWeightKg: 70 },
    ]);

    expect(result.actualKg).toBe(70);
    expect(result.targetKg).toBe(165);
    expect(result.percentageOfTarget).toBe(42); // round(70/165*100)
    expect(result.status).toBe('under');
  });

  it('flags on-target when actual is close to target', () => {
    const result = aggregateVolume([
      { weightKg: 92, targetWeightKg: 95 },
      { weightKg: 68, targetWeightKg: 70 },
    ]);

    expect(result.percentageOfTarget).toBe(97); // round(160/165*100)
    expect(result.status).toBe('on-target');
  });

  it('flags over when actual significantly exceeds target', () => {
    const result = aggregateVolume([{ weightKg: 150, targetWeightKg: 95 }]);

    expect(result.percentageOfTarget).toBe(158);
    expect(result.status).toBe('over');
  });

  it('returns zero percentage and no crash when target is zero (empty scope)', () => {
    const result = aggregateVolume([]);
    expect(result).toEqual({ actualKg: 0, targetKg: 0, percentageOfTarget: 0, status: 'under' });
  });
});
