// =============================================================================
// Fichier : api.ts
// Rôle : Service API : le SEUL endroit du front qui appelle l'API NestJS.
//   - construit l'adresse complète à partir de VITE_API_URL ;
//   - ajoute le JWT (en-tête Authorization) s'il existe ;
//   - transforme toute erreur (réseau ou réponse de l'API) en ApiError avec un
//     message en français, prêt à être affiché dans un bandeau d'erreur.
//   Gère aussi la conservation du JWT dans sessionStorage (effacé à la
//   fermeture de l'onglet).
// Utilise :
//   - frontend/.env (VITE_API_URL) : adresse de l'API
//   - l'API NestJS : routes /api/auth/register, /api/auth/login, /api/auth/me
//     (contrat d'interface)
// Utilisé par :
//   - context/AuthProvider.tsx (connexion, déconnexion, vérification de session)
//   - pages/Login.tsx, pages/Register.tsx (brique 3)
// =============================================================================

// Adresse de base de l'API (ex. http://localhost:3000/api), lue dans
// frontend/.env
const API_URL = import.meta.env.VITE_API_URL;

// Nom de la « case » où le JWT est rangé dans le navigateur
const TOKEN_KEY = 'datashare.token';

// ---- Conservation du JWT ----------------------------------------------------
// 🔒 sessionStorage : le jeton survit au rechargement (F5) mais est effacé à la
// fermeture de l'onglet.
// Combiné à la durée de vie d'1 h du JWT, cela limite la fenêtre d'exposition.
// try/catch : certains navigateurs (navigation privée stricte) refusent l'accès
// au stockage.
export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Stockage indisponible : la session ne survivra simplement pas au
    // rechargement.
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Rien à effacer si le stockage est indisponible.
  }
}

// ---- Erreurs ----------------------------------------------------------------
// Erreur « maison » qui garde le code HTTP (401, 409…) et un message lisible
// par l'utilisateur.
// status = 0 : l'API n'a pas pu être jointe (serveur arrêté, réseau coupé).
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---- Types des réponses (repris du contrat d'interface) ---------------------
export interface User {
  id: number;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse extends User {
  createdAt: string;
}

// ---- Fonction d'appel commune -----------------------------------------------
// <T> : le type de la réponse attendue, précisé à chaque appel (ex.
// request<User>(...)).
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  // Les données envoyées sont du JSON (sauf l'envoi de fichier, qui gérera son
  // propre format)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  // 🔒 Le JWT est ajouté automatiquement ; il n'est jamais mis dans l'adresse
  const token = readToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: headers,
    });
  } catch {
    // fetch échoue seulement si l'API est injoignable (serveur arrêté, réseau,
    // CORS)
    throw new ApiError(
      0,
      'Impossible de joindre le serveur. Réessaie dans quelques instants.',
    );
  }

  // 204 No Content : succès sans contenu (ex. suppression d'un fichier)
  if (response.status === 204) {
    return undefined as T;
  }

  // Lecture du corps : l'API répond en JSON, y compris pour les erreurs
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Format d'erreur de l'API : { statusCode, message, error } ; message peut
    // être une liste (validation)
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message)
      ? message.join(' ')
      : (message ?? 'Une erreur est survenue. Réessaie plus tard.');
    throw new ApiError(response.status, text);
  }

  return body as T;
}

// ---- Routes d'authentification (US03, US04) ---------------------------------
export const authApi = {
  // POST /api/auth/register → 201 { id, email, createdAt } ou 400 / 409
  register: (email: string, password: string) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // POST /api/auth/login → 200 { accessToken, user } ou 400 / 401
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // GET /api/auth/me → 200 { id, email } ou 401 (jeton absent, invalide ou
  // expiré)
  me: () => request<User>('/auth/me'),
};
