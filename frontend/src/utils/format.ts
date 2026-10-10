// =============================================================================
// Fichier : format.ts
// Rôle : Fonctions de mise en forme partagées par les écrans (aucun affichage
//   ici) : taille lisible (« 2,6 Mo ») et délai d'expiration en français
//   (« Expire dans 2 jours », « Expire demain », « Expiré »).
// Utilise :
//   - rien (fonctions JavaScript standard)
// Utilisé par :
//   - pages Mon espace, Téléversement et Téléchargement
// =============================================================================

const UNITS = ['o', 'Ko', 'Mo', 'Go'];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 2726297 → « 2,6 Mo ». On divise par 1024 tant que c'est possible, puis on
// affiche avec une virgule à la française (toLocaleString 'fr-FR').
export function formatSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: digits })} ${UNITS[unit]}`;
}

// Nombre de jours CALENDAIRES entre aujourd'hui et la date d'expiration :
// 0 = aujourd'hui, 1 = demain… (on compare les dates à minuit, sinon un
// fichier qui expire dans 3 heures, mais demain, serait « aujourd'hui »)
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(isoDate);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(target) - startOfDay(now)) / ONE_DAY_MS);
}

// Libellé de la liste « Mon espace » (maquette)
export function expiryLabel(isoDate: string, now: Date = new Date()): string {
  if (new Date(isoDate) <= now) return 'Expiré';
  const days = daysUntil(isoDate, now);
  if (days <= 0) return "Expire aujourd'hui";
  if (days === 1) return 'Expire demain';
  return `Expire dans ${days} jours`;
}
