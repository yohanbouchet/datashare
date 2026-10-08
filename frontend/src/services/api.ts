// ================================================================================================
// Fichier : api.ts
// Rôle : Service API : le SEUL endroit du front qui appelle l'API NestJS.
//   - construit l'adresse complète à partir de VITE_API_URL ;
//   - ajoute le JWT (en-tête Authorization) s'il existe ;
//   - transforme toute erreur (réseau ou réponse de l'API) en ApiError avec un message en français,
//     prêt à être affiché dans un bandeau d'erreur.
//   Gère aussi la conservation du JWT dans sessionStorage (effacé à la fermeture de l'onglet).
// Utilise :
//   - frontend/.env (VITE_API_URL) : adresse de l'API
//   - l'API NestJS : routes /api/auth/register, /api/auth/login, /api/auth/me (contrat d'interface)
// Utilisé par :
//   - context/AuthContext.tsx (connexion, déconnexion, vérification de session)
//   - pages/Connexion.tsx, pages/Inscription.tsx (brique 3)
// ================================================================================================

// Adresse de base de l'API (ex. http://localhost:3000/api), lue dans frontend/.env
const API_URL = import.meta.env.VITE_API_URL;

// Nom de la « case » où le JWT est rangé dans le navigateur
const CLE_JETON = 'datashare.jeton';

// ---- Conservation du JWT --------------------------------------------------------------------
// 🔒 sessionStorage : le jeton survit au rechargement (F5) mais est effacé à la fermeture de l'onglet.
// Combiné à la durée de vie d'1 h du JWT, cela limite la fenêtre d'exposition.
// try/catch : certains navigateurs (navigation privée stricte) refusent l'accès au stockage.
export function lireJeton(): string | null {
  try {
    return sessionStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}

export function enregistrerJeton(jeton: string): void {
  try {
    sessionStorage.setItem(CLE_JETON, jeton);
  } catch {
    // Stockage indisponible : la session ne survivra simplement pas au rechargement.
  }
}

export function effacerJeton(): void {
  try {
    sessionStorage.removeItem(CLE_JETON);
  } catch {
    // Rien à effacer si le stockage est indisponible.
  }
}

// ---- Erreurs --------------------------------------------------------------------------------
// Erreur « maison » qui garde le code HTTP (401, 409…) et un message lisible par l'utilisateur.
// status = 0 : l'API n'a pas pu être jointe (serveur arrêté, réseau coupé).
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---- Types des réponses (repris du contrat d'interface) ---------------------------------------
export interface Utilisateur {
  id: number;
  email: string;
}

export interface ReponseConnexion {
  accessToken: string;
  user: Utilisateur;
}

export interface ReponseInscription extends Utilisateur {
  createdAt: string;
}

// ---- Fonction d'appel commune -----------------------------------------------------------------
// <T> : le type de la réponse attendue, précisé à chaque appel (ex. requete<Utilisateur>(...)).
async function requete<T>(
  chemin: string,
  options: RequestInit = {},
): Promise<T> {
  const entetes = new Headers(options.headers);
  // Les données envoyées sont du JSON (sauf l'envoi de fichier, qui gérera son propre format)
  if (options.body && !(options.body instanceof FormData)) {
    entetes.set('Content-Type', 'application/json');
  }
  // 🔒 Le JWT est ajouté automatiquement ; il n'est jamais mis dans l'adresse
  const jeton = lireJeton();
  if (jeton) {
    entetes.set('Authorization', `Bearer ${jeton}`);
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      ...options,
      headers: entetes,
    });
  } catch {
    // fetch échoue seulement si l'API est injoignable (serveur arrêté, réseau, CORS)
    throw new ApiError(
      0,
      'Impossible de joindre le serveur. Réessaie dans quelques instants.',
    );
  }

  // 204 No Content : succès sans contenu (ex. suppression d'un fichier)
  if (reponse.status === 204) {
    return undefined as T;
  }

  // Lecture du corps : l'API répond en JSON, y compris pour les erreurs
  const corps: unknown = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    // Format d'erreur de l'API : { statusCode, message, error } ; message peut être une liste (validation)
    const message = (corps as { message?: string | string[] } | null)?.message;
    const texte = Array.isArray(message)
      ? message.join(' ')
      : (message ?? 'Une erreur est survenue. Réessaie plus tard.');
    throw new ApiError(reponse.status, texte);
  }

  return corps as T;
}

// ---- Routes d'authentification (US03, US04) ---------------------------------------------------
export const authApi = {
  // POST /api/auth/register → 201 { id, email, createdAt } ou 400 / 409
  inscription: (email: string, password: string) =>
    requete<ReponseInscription>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // POST /api/auth/login → 200 { accessToken, user } ou 400 / 401
  connexion: (email: string, password: string) =>
    requete<ReponseConnexion>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // GET /api/auth/me → 200 { id, email } ou 401 (jeton absent, invalide ou expiré)
  moi: () => requete<Utilisateur>('/auth/me'),
};
