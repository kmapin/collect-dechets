import { aggregateVolume } from './volume.util';

describe('volume.util - aggregateVolume', () => {
  it('sums actual (completed) and target (total) collections across points and flags under-target when actual is significantly below target', () => {
    const result = aggregateVolume([
      { totalCollections: 95, completedCollections: 40 },
      { totalCollections: 70, completedCollections: 30 },
    ]);

    expect(result.actualCollections).toBe(70);
    expect(result.targetCollections).toBe(165);
    expect(result.percentageOfTarget).toBe(42); // round(70/165*100)
    expect(result.status).toBe('under');
  });

  it('flags on-target when actual is close to target', () => {
    const result = aggregateVolume([
      { totalCollections: 95, completedCollections: 92 },
      { totalCollections: 70, completedCollections: 68 },
    ]);

    expect(result.percentageOfTarget).toBe(97); // round(160/165*100)
    expect(result.status).toBe('on-target');
  });

  it('flags over when actual significantly exceeds target', () => {
    const result = aggregateVolume([{ totalCollections: 95, completedCollections: 150 }]);

    expect(result.percentageOfTarget).toBe(158);
    expect(result.status).toBe('over');
  });

  it('returns zero percentage and no crash when target is zero (empty scope)', () => {
    const result = aggregateVolume([]);
    expect(result).toEqual({ actualCollections: 0, targetCollections: 0, percentageOfTarget: 0, status: 'under' });
  });
});
