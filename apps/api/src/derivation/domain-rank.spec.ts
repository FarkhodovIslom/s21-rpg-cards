import { deriveDomainRank } from './domain-rank.js';

describe('deriveDomainRank', () => {
  it('derives a domain and rank from mapped skills', () => {
    expect(deriveDomainRank([{ name: 'C', value: 1790 }])).toEqual({
      domain: 'Systems',
      rank: 'Adept',
    });
  });

  it.each([
    [499, 'Rookie'], [500, 'Apprentice'], [999, 'Apprentice'],
    [1000, 'Adept'], [1999, 'Adept'], [2000, 'Veteran'],
    [3999, 'Veteran'], [4000, 'Legendary'],
  ])('uses inclusive threshold %s as %s', (value, rank) => {
    expect(deriveDomainRank([{ name: 'C', value }]).rank).toBe(rank);
  });

  it('sums skills within each domain and ignores unknown skills', () => {
    expect(deriveDomainRank([
      { name: 'C', value: 1200 },
      { name: 'Linux', value: 900 },
      { name: 'Unknown skill', value: 9000 },
      { name: 'DB & Data', value: 1500 },
    ])).toEqual({ domain: 'Systems', rank: 'Veteran' });
  });

  it('returns nulls when no mapped skills exist', () => {
    expect(deriveDomainRank([])).toEqual({ domain: null, rank: null });
    expect(deriveDomainRank([{ name: 'Unknown', value: 100 }])).toEqual({ domain: null, rank: null });
  });

  it('breaks domain ties by highest individual skill', () => {
    expect(deriveDomainRank([
      { name: 'C', value: 1000 },
      { name: 'DB & Data', value: 600 },
      { name: 'DB & Data', value: 400 },
    ])).toEqual({ domain: 'Systems', rank: 'Adept' });
  });

  it('breaks complete ties lexically and is input-order independent', () => {
    const skills = [{ name: 'C', value: 1000 }, { name: 'DB & Data', value: 1000 }];
    expect(deriveDomainRank(skills)).toEqual({ domain: 'Data', rank: 'Adept' });
    expect(deriveDomainRank([...skills].reverse())).toEqual({ domain: 'Data', rank: 'Adept' });
  });

  it('handles zero and invalid values without mutating input', () => {
    const skills = [{ name: 'C', value: 0 }, { name: 'Linux', value: Number.NaN }];
    expect(deriveDomainRank(skills)).toEqual({ domain: 'Systems', rank: 'Rookie' });
    expect(skills).toEqual([{ name: 'C', value: 0 }, { name: 'Linux', value: Number.NaN }]);
  });
});
