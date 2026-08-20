import { bornesPeriode } from './periode.util';

describe('periode.util', () => {
  describe('bornesPeriode', () => {
    it('mois de 31 jours (août) : debut = 1er, fin = 31', () => {
      const { debut, fin } = bornesPeriode({ mois: 8, annee: 2026 });
      expect(debut.getFullYear()).toBe(2026);
      expect(debut.getMonth()).toBe(7); // 0-indexé
      expect(debut.getDate()).toBe(1);
      expect(fin.getMonth()).toBe(7);
      expect(fin.getDate()).toBe(31);
    });

    it('mois de 30 jours (septembre) : fin = 30, jamais 31', () => {
      const { fin } = bornesPeriode({ mois: 9, annee: 2026 });
      expect(fin.getMonth()).toBe(8);
      expect(fin.getDate()).toBe(30);
    });

    it('février année bissextile (2028) : fin = 29', () => {
      const { fin } = bornesPeriode({ mois: 2, annee: 2028 });
      expect(fin.getDate()).toBe(29);
    });

    it('février année non bissextile (2026) : fin = 28', () => {
      const { fin } = bornesPeriode({ mois: 2, annee: 2026 });
      expect(fin.getDate()).toBe(28);
    });

    it('décembre : fin reste dans la même année (pas de débordement sur janvier suivant)', () => {
      const { debut, fin } = bornesPeriode({ mois: 12, annee: 2026 });
      expect(debut.getFullYear()).toBe(2026);
      expect(fin.getFullYear()).toBe(2026);
      expect(fin.getMonth()).toBe(11);
      expect(fin.getDate()).toBe(31);
    });
  });
});
