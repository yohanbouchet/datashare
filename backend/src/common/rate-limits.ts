// =============================================================================
// Fichier : rate-limits.ts
// Rôle : Limites de fréquence des requêtes (anti-force brute, OWASP A07),
//   réunies en un seul endroit. Chaque limite compte les requêtes par
//   adresse IP et par route, sur une fenêtre d'une minute ; au-delà, l'API
//   répond 429 « Trop de tentatives ».
//   - GLOBAL_LIMIT : toutes les routes (protection contre les abus) ;
//   - STRICT_LIMIT : routes qui vérifient un mot de passe ou créent un compte
//     (inscription, connexion, vérification du mot de passe d'un fichier) ;
//   - DOWNLOAD_LIMIT : téléchargement (il revérifie aussi le mot de passe).
// Utilise :
//   - @nestjs/throttler (format des limites)
// Utilisé par :
//   - app.module.ts (limite globale) ; auth/auth.controller.ts,
//     files/download.controller.ts (@Throttle)
// =============================================================================
const ONE_MINUTE_MS = 60 * 1000;

export const RATE_LIMIT_MESSAGE =
  'Trop de tentatives. Réessaie dans une minute.';

// 100 requêtes par minute et par adresse IP, sur chaque route
export const GLOBAL_LIMIT = { ttl: ONE_MINUTE_MS, limit: 100 };

// 5 essais par minute : deviner un mot de passe de 8 caractères devient
// irréaliste (des années, au lieu de quelques heures sans limite)
export const STRICT_LIMIT = { default: { ttl: ONE_MINUTE_MS, limit: 5 } };

// 10 téléchargements par minute et par adresse IP
export const DOWNLOAD_LIMIT = { default: { ttl: ONE_MINUTE_MS, limit: 10 } };
