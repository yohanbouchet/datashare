// =============================================================================
// Fichier : format.test.ts
// Rôle : Tests unitaires des fonctions de mise en forme (npm test) : taille
//   lisible et délais d'expiration. La date « maintenant » est fixée par le
//   test, pour que le résultat ne dépende pas du jour où il est lancé.
// Utilise :
//   - utils/format.ts (la pièce testée)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { daysUntil, expiryLabel, formatSize } from './format.ts';

describe('formatSize', () => {
  it('affiche octets, Ko, Mo et Go avec une virgule à la française', () => {
    expect(formatSize(18)).toBe('18 o');
    expect(formatSize(2048)).toBe('2 Ko');
    expect(formatSize(2726297)).toBe('2,6 Mo');
    expect(formatSize(1024 ** 3)).toBe('1 Go');
    expect(formatSize(1.1 * 1024 ** 3)).toBe('1,1 Go');
  });
});

describe('daysUntil et expiryLabel', () => {
  // « Maintenant » : le 10 octobre 2026 à 23 h (heure locale)
  const now = new Date(2026, 9, 10, 23, 0);
  const at = (day: number, hour: number, minute = 0) =>
    new Date(2026, 9, day, hour, minute).toISOString();

  it('compte en jours calendaires : demain 8 h, vu à 23 h, c’est « demain »', () => {
    expect(daysUntil(at(11, 8), now)).toBe(1);
    expect(expiryLabel(at(11, 8), now)).toBe('Expire demain');
  });

  it('affiche « aujourd’hui », « dans N jours » et « Expiré »', () => {
    // Dans 30 minutes, le même jour
    expect(expiryLabel(at(10, 23, 30), now)).toBe("Expire aujourd'hui");
    expect(expiryLabel(at(13, 12), now)).toBe('Expire dans 3 jours');
    expect(expiryLabel(at(10, 22), now)).toBe('Expiré');
  });
});
