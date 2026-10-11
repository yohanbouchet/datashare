// =============================================================================
// Fichier : transfert.k6.js
// Rôle : Test de performance k6 des fonctions critiques de DataShare (PERF.md)
//   sur l'API lancée en mode production. 4 scénarios :
//   1. upload : envois de fichiers de 10 Mo (US01), 1 toutes les 2 s, pendant
//      1 min, par 3 utilisateurs virtuels au plus ;
//   2. info : consultation de la page d'un lien (US02, lecture en base),
//      90 par minute ;
//   3. download : téléchargements du fichier de 10 Mo (US02), 8 par minute,
//      avec vérification que le fichier reçu est IDENTIQUE (empreinte
//      SHA-256) ;
//   4. burst (après les autres) : rafale de 20 connexions avec un mauvais mot
//      de passe → la protection anti-force brute doit répondre 401 puis 429.
//   Les rythmes restent SOUS les limites par adresse IP (rate-limits.ts) : on
//   mesure un utilisateur réaliste, la rafale vérifie la protection.
//   Les fichiers créés sont supprimés à la fin (teardown).
// Utilise :
//   - l'API : /api/auth/register, /api/auth/login, /api/files,
//     /api/download/:token
//   - variable API_URL (par défaut http://localhost:3000/api)
// Utilisé par :
//   - commande décrite dans docs/qualite/PERF.md (k6 lancé depuis son image
//     Docker : docker run … grafana/k6:2.3.0 run perf/transfert.k6.js)
// =============================================================================
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const API = __ENV.API_URL || 'http://localhost:3000/api';
const FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const PASSWORD = 'perf-motdepasse8';

// Contenu du fichier envoyé : 10 Mo d'octets variés (0, 1, 2… 255, 0…),
// préparé une seule fois par utilisateur virtuel
const content = new Uint8Array(FILE_SIZE);
for (let i = 0; i < FILE_SIZE; i++) content[i] = i % 256;

// Débit mesuré en Mo/s (métrique personnalisée, affichée dans le résumé)
const uploadSpeed = new Trend('upload_mo_par_s');
const downloadSpeed = new Trend('download_mo_par_s');

export const options = {
  scenarios: {
    upload: {
      executor: 'constant-arrival-rate',
      exec: 'upload',
      rate: 1,
      timeUnit: '2s',
      duration: '1m',
      preAllocatedVUs: 3,
    },
    info: {
      executor: 'constant-arrival-rate',
      exec: 'info',
      rate: 90,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 2,
    },
    download: {
      executor: 'constant-arrival-rate',
      exec: 'download',
      rate: 8,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 2,
    },
    burst: {
      executor: 'per-vu-iterations',
      exec: 'burst',
      vus: 1,
      iterations: 1,
      startTime: '1m5s',
    },
  },
  // Critères d'acceptation : le test échoue si l'un d'eux n'est pas tenu
  thresholds: {
    'http_req_duration{scenario:info}': ['p(95)<200'],
    'http_req_duration{scenario:upload}': ['p(95)<2000'],
    'http_req_duration{scenario:download}': ['p(95)<2000'],
    'http_req_failed{scenario:upload}': ['rate==0'],
    'http_req_failed{scenario:info}': ['rate==0'],
    'http_req_failed{scenario:download}': ['rate==0'],
    checks: ['rate==1'],
  },
};

// Envoi d'un fichier de 10 Mo (multipart/form-data, comme le front)
function sendFile(token) {
  return http.post(
    `${API}/files`,
    {
      file: http.file(
        content.buffer,
        'perf-10mo.bin',
        'application/octet-stream',
      ),
      expiresInDays: '1',
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

// Préparation (une fois) : un compte de test, son JWT, un fichier partagé
export function setup() {
  const email = `perf-${Date.now()}@mail.fr`;
  http.post(
    `${API}/auth/register`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const login = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const jwt = login.json('accessToken');
  const shared = sendFile(jwt).json('token');
  return { email, jwt, shared };
}

// Scénario 1 : téléversement (US01)
export function upload(data) {
  const res = sendFile(data.jwt);
  check(res, { 'upload : 201 créé': (r) => r.status === 201 });
  uploadSpeed.add(10 / (res.timings.duration / 1000));
}

// Scénario 2 : informations avant téléchargement (US02)
export function info(data) {
  const res = http.get(`${API}/download/${data.shared}`);
  check(res, {
    'info : 200': (r) => r.status === 200,
    'info : taille annoncée 10 Mo': (r) => r.json('size') === FILE_SIZE,
  });
}

// Empreinte SHA-256 (hexadécimal) d'un contenu binaire
async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

// Scénario 3 : téléchargement du fichier (US02), reçu en binaire
export async function download(data) {
  const res = http.post(`${API}/download/${data.shared}`, null, {
    responseType: 'binary',
  });
  const same =
    res.status === 200 &&
    (await sha256(res.body)) === (await sha256(content.buffer));
  check(res, {
    'download : 200': (r) => r.status === 200,
    'download : fichier identique (SHA-256)': () => same,
  });
  downloadSpeed.add(10 / (res.timings.duration / 1000));
}

// Scénario 4 : rafale de mauvais mots de passe (anti-force brute, OWASP A07)
export function burst(data) {
  // 401 et 429 sont les réponses ATTENDUES ici (pas des échecs)
  const expected = http.expectedStatuses(401, 429);
  const statuses = [];
  for (let i = 0; i < 20; i++) {
    const res = http.post(
      `${API}/auth/login`,
      JSON.stringify({ email: data.email, password: 'mauvais-mdp' }),
      {
        headers: { 'Content-Type': 'application/json' },
        responseCallback: expected,
      },
    );
    statuses.push(res.status);
  }
  const blocked = statuses.filter((s) => s === 429).length;
  console.log(`Rafale : ${statuses.join(' ')} → ${blocked} bloquées (429)`);
  check(statuses, {
    'rafale : bloquée par 429 après quelques essais': (s) => blocked >= 15,
    'rafale : aucune erreur serveur (5xx)': (s) => s.every((x) => x < 500),
  });
  sleep(1);
}

// Nettoyage : suppression de tous les fichiers du compte de test
export function teardown(data) {
  const auth = { headers: { Authorization: `Bearer ${data.jwt}` } };
  const files = http.get(`${API}/files?status=all`, auth).json();
  for (const file of files) http.del(`${API}/files/${file.id}`, null, auth);
  console.log(`Nettoyage : ${files.length} fichier(s) supprimé(s)`);
}
