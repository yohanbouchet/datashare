// =============================================================================
// Fichier : api.test.ts
// Rôle : Tests du service API (npm test) : la fonction fetch du navigateur
//   est remplacée par une doublure, pour vérifier ce qui est ENVOYÉ (adresse,
//   méthode, en-têtes, JWT) et la façon dont les réponses et les erreurs de
//   l'API sont traduites (ApiError avec un message en français).
// Utilise :
//   - services/api.ts (la pièce testée)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import {
  ApiError,
  authApi,
  clearToken,
  downloadApi,
  filesApi,
  readToken,
  saveToken,
} from './api.ts';

const API_URL = import.meta.env.VITE_API_URL;

// Réponse factice de l'API
function reply(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Service API', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearToken();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // Requête envoyée lors du dernier appel à fetch
  const lastRequest = () => {
    const [url, options] = fetchMock.mock.calls[0];
    return { url, options: options!, headers: options!.headers as Headers };
  };

  it('conserve, relit et efface le JWT (sessionStorage)', () => {
    saveToken('jeton');
    expect(readToken()).toBe('jeton');
    expect(sessionStorage.getItem('datashare.token')).toBe('jeton');
    clearToken();
    expect(readToken()).toBeNull();
  });

  it('envoie la connexion en JSON et renvoie la réponse de l’API', async () => {
    fetchMock.mockResolvedValue(
      reply(200, { accessToken: 'abc', user: { id: 1, email: 'a@b.fr' } }),
    );

    const result = await authApi.login('a@b.fr', 'motdepasse8');

    const { url, options, headers } = lastRequest();
    expect(url).toBe(`${API_URL}/auth/login`);
    expect(options.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'a@b.fr',
      password: 'motdepasse8',
    });
    expect(result.accessToken).toBe('abc');
  });

  it('🔒 ajoute le JWT dans l’en-tête Authorization, jamais dans l’adresse', async () => {
    saveToken('mon-jeton');
    fetchMock.mockResolvedValue(reply(200, []));

    await filesApi.list('all');

    const { url, headers } = lastRequest();
    expect(url).toBe(`${API_URL}/files?status=all`);
    expect(headers.get('Authorization')).toBe('Bearer mon-jeton');
  });

  it('204 (suppression) : succès sans contenu', async () => {
    fetchMock.mockResolvedValue(reply(204));

    await expect(filesApi.remove(3)).resolves.toBeUndefined();
    expect(lastRequest().options.method).toBe('DELETE');
  });

  it('erreur de l’API : ApiError avec le code et le message (liste jointe)', async () => {
    fetchMock.mockResolvedValue(
      reply(400, { message: ['Message 1', 'Message 2'], statusCode: 400 }),
    );

    const error = await authApi.register('x', 'y').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'Message 1 Message 2',
    });
  });

  it('serveur injoignable : ApiError 0 avec un message clair', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(authApi.me()).rejects.toMatchObject({
      status: 0,
      message:
        'Impossible de joindre le serveur. Réessaie dans quelques instants.',
    });
  });

  it('téléchargement : jeton encodé dans l’adresse, mot de passe dans le corps', async () => {
    fetchMock.mockResolvedValue(reply(204));

    await downloadApi.verify('a/b', 'secret1');

    const { url, options } = lastRequest();
    expect(url).toBe(`${API_URL}/download/a%2Fb/verify`);
    expect(JSON.parse(options.body as string)).toEqual({ password: 'secret1' });
    expect(downloadApi.fileUrl('a/b')).toBe(`${API_URL}/download/a%2Fb`);
  });
});
