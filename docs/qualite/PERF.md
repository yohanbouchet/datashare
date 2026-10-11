# PERF – Performance de DataShare

> Mesures du 11/10/2026, sur la machine de développement (8 cœurs, 15 Go de mémoire, Ubuntu 26.04).
> L'API est lancée **en mode production** (code compilé, `node dist/main.js`) et le front est mesuré sur sa **version de production** (`npm run build`).

## 1. Test de performance des fonctions critiques (back-end)

**Outil : k6** (Grafana), lancé depuis son image Docker officielle, version fixée `grafana/k6:2.3.0` : rien à installer.
Script : [`perf/transfert.k6.js`](../../perf/transfert.k6.js).

### Scénarios

Les 3 premiers scénarios tournent **en même temps** pendant 1 minute, comme un mélange d'usages réels. La rafale vient ensuite.

| Scénario | Endpoint | Rythme | Ce qui est vérifié |
|---|---|---|---|
| Téléversement (US01) | `POST /api/files` | 1 fichier de **10 Mo** toutes les 2 s (30 envois) | Réponse 201 ; temps de réponse ; débit |
| Informations d'un lien (US02) | `GET /api/download/:token` | 90 par minute | Réponse 200 et taille annoncée exacte ; temps de réponse (lecture en base) |
| Téléchargement (US02) | `POST /api/download/:token` | 8 par minute | Réponse 200 ; **fichier reçu identique** (empreinte SHA-256) ; débit |
| Rafale anti-force brute | `POST /api/auth/login` | 20 mauvais mots de passe d'affilée | 429 (« trop de tentatives ») après quelques essais ; aucune erreur serveur |

**Pourquoi rester sous les limites ?** La limitation des tentatives (SECURITY.md, OWASP A07) compte **par adresse IP** : 10 téléchargements et 100 requêtes par minute et par route.
k6 envoie tout depuis une seule machine : au-delà, il ne mesurerait plus que des refus 429.
Les scénarios mesurent donc **un utilisateur réaliste** ; la rafale vérifie à part que la protection fonctionne.

### Critères d'acceptation (seuils k6 : le test échoue si l'un n'est pas tenu)

| Critère | Seuil | Mesure | |
|---|---|---|---|
| Temps de réponse des informations d'un lien (95 % des requêtes) | < 200 ms | **7,2 ms** | ✅ |
| Temps de réponse d'un téléversement de 10 Mo (95 %) | < 2 s | **100 ms** | ✅ |
| Temps de réponse d'un téléchargement de 10 Mo (95 %) | < 2 s | **53 ms** | ✅ |
| Requêtes en échec (3 scénarios) | 0 % | **0 %** (130 requêtes) | ✅ |
| Vérifications réussies (codes, taille, fichier identique, rafale) | 100 % | **100 %** (232 sur 232) | ✅ |

### Résultats détaillés

| Scénario | Requêtes | Temps moyen | Médiane | 95e centile | Maximum | Débit moyen |
|---|---|---|---|---|---|---|
| Téléversement 10 Mo | 30 | 68 ms | 87 ms | 100 ms | 104 ms | ≈ 200 Mo/s |
| Informations d'un lien | 91 | 5,4 ms | 5,3 ms | 7,2 ms | 8 ms | — |
| Téléchargement 10 Mo | 9 | 36 ms | 31 ms | 53 ms | 55 ms | ≈ 310 Mo/s |

**Rafale** : `401 401 401 401 401 429 429 … 429` → les 5 premiers essais sont refusés comme mauvais mot de passe (401), **les 15 suivants sont bloqués** (429), sans aucune erreur serveur.
C'est le résultat attendu : la protection anti-force brute fonctionne.

**Ressources du serveur pendant le test** (relevées toutes les 5 s avec `ps` et `docker stats`) :

| Composant | Mémoire | Processeur |
|---|---|---|
| API (Node.js) | **114 à 134 Mo, stable**, alors que 325 Mo de fichiers ont été envoyés | moins de 3 % en moyenne |
| Base PostgreSQL (conteneur) | 30 à 35 Mo | moins de 5 % |

Capture du résumé k6 : [`docs/rapports/k6-resultats.png`](../rapports/k6-resultats.png).

### Interprétation

- **Les fichiers passent en flux.** La mémoire de l'API ne bouge pas, alors que 30 fichiers de 10 Mo arrivent et que 9 repartent. Un fichier n'est jamais chargé entièrement en mémoire : c'est ce qui permet d'accepter des fichiers de 1 Go sans saturer le serveur.
- **La base n'est pas un goulot d'étranglement.** Lire les informations d'un lien prend 5 ms (recherche par le jeton, colonne indexée par sa contrainte `UNIQUE`).
- **Le téléversement est plus lent que le téléchargement.** C'est normal : il cumule l'écriture sur le disque, le calcul du hachage bcrypt si un mot de passe est donné (aucun ici) et l'enregistrement en base.
- ⚠️ **Limite de la mesure** : tout se passe sur la même machine, **sans réseau**. Les débits mesurés (200 à 300 Mo/s) montrent ce que le **serveur** sait traiter. Pour un utilisateur, la vitesse dépendra de sa connexion : avec une fibre à 100 Mo/s, son réseau sera le facteur limitant, pas DataShare.
- **Un test de forte charge** (des centaines d'utilisateurs simultanés) demanderait **plusieurs adresses sources**, pour respecter la limitation par IP sans la désactiver. Voir les évolutions (section 5).

### Relancer le test

```bash
# 1. Base démarrée, puis API compilée lancée en mode production sur le port 3001
cd backend && npm run build && NODE_ENV=production PORT=3001 node dist/main.js

# 2. Dans un autre terminal, à la racine du projet
docker run --rm --network host -v "$PWD/perf:/perf:ro" grafana/k6:2.3.0 \
  run -e API_URL=http://localhost:3001/api /perf/transfert.k6.js
```

Le script crée un compte `perf-…@mail.fr`, puis supprime tous ses fichiers à la fin. Attendre une minute entre deux lancements : la rafale bloque les connexions depuis la machine pendant une minute.

## 2. Budget de performance côté front

**Outils** : le poids du site produit par `npm run build`, et **Lighthouse** (outil d'audit de Google, intégré à Chrome), version 13.5.0, en profils **mobile** (téléphone moyen, réseau 4G lent simulé) et **ordinateur**.

### Budget

| Indicateur | Budget | Mesure | |
|---|---|---|---|
| JavaScript livré (compressé gzip) | ≤ 150 Ko | **88,5 Ko** (281 Ko non compressé) | ✅ |
| CSS livré (gzip) | ≤ 20 Ko | **2,9 Ko** | ✅ |
| Poids total d'une page | ≤ 300 Ko | **129 Ko** | ✅ |
| Score Lighthouse Performance (mobile) | ≥ 90 | **99** | ✅ |
| Affichage du contenu principal (LCP, mobile) | ≤ 2,5 s | **1,7 s** | ✅ |
| Temps de blocage (TBT, mobile) | ≤ 200 ms | **40 ms** | ✅ |
| Décalage de mise en page (CLS) | ≤ 0,1 | **0,004** | ✅ |
| Score Lighthouse Accessibilité | 100 | **100** (après correction, voir ci-dessous) | ✅ |

Les seuils de LCP, TBT et CLS sont ceux que Google considère comme « bons » (*Core Web Vitals*).

### Scores Lighthouse

| Page | Profil | Performance | Accessibilité | Bonnes pratiques | Référencement (SEO) |
|---|---|---|---|---|---|
| Accueil `/` | mobile / ordinateur | 99 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Connexion `/connexion` | mobile / ordinateur | 99 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Téléchargement `/d/…` (lien invalide) | mobile / ordinateur | 99 / 100 | 100 / 100 | 96 / 96 | 63 / 63 (voulu) |

Sur la page de téléchargement, deux résultats sont **voulus** :
- **SEO 63** : `robots.txt` interdit aux moteurs de recherche d'indexer les liens de partage (`/d/`). Lighthouse le signale, mais c'est une mesure de **confidentialité** ;
- **Bonnes pratiques 96** : le navigateur note dans sa console la réponse 404 de l'API, car le test porte justement sur un lien invalide.

### Anomalie détectée et corrigée : contraste des couleurs

Au premier passage, la page de connexion obtenait **92 en accessibilité** : l'orange de la maquette était trop clair pour du texte. La norme **WCAG** (niveau AA) demande un contraste d'au moins 4,5:1.
Toutes les couleurs de texte du site ont alors été vérifiées, y compris celles que la page auditée n'affichait pas :

| Élément | Avant | Après |
|---|---|---|
| Liens orange, bouton « Changer » | `#e27f29` : 2,9:1 ❌ | `#a0561a` : 5,5:1 ✅ |
| Texte des boutons orange | `#ba681f` : 3,7:1 ❌ | `#a0561a` : 4,9:1 ✅ |
| Messages d'erreur sous les champs | `#f14343` : 3,7:1 ❌ | `#c62828` : 5,6:1 ✅ |
| Texte du bandeau orange (« expire demain ») | `#aa642b` : 4,3:1 ❌ | `#8f4d16` : 6:1 ✅ |
| Filtre sélectionné (texte blanc) | fond `#e77a6e` : 2,8:1 ❌ | fond `#bb4d43` : 4,9:1 ✅ |

Correction : 5 variables de couleur dans `frontend/src/index.css`. Les bordures et les fonds de la maquette sont conservés.
Captures : [avant](../rapports/lighthouse-connexion-avant.png) · [après](../rapports/lighthouse-connexion-apres.png).
Le même audit a fait ajouter `robots.txt` (SEO de 91 à 100 sur les pages publiques).

### Relancer les mesures

```bash
cd frontend
npm run build                      # affiche le poids de chaque fichier (gzip compris)
npx vite preview --port 4173       # sert la version de production
# Dans un autre terminal (Chrome installé) :
npx lighthouse@13.5.0 http://localhost:4173/connexion --view                    # mobile
npx lighthouse@13.5.0 http://localhost:4173/connexion --preset=desktop --view   # ordinateur
```

Lighthouse est aussi disponible dans Chrome : outils de développement (F12), onglet « Lighthouse ».

## 3. Suivi des métriques

| Métrique | Où la lire | Valeur de référence (11/10/2026) |
|---|---|---|
| Temps de réponse de l'API | Résumé k6 (moyenne, médiane, 95e centile par scénario) | 5 ms (lecture), 68 ms (envoi de 10 Mo), 36 ms (téléchargement de 10 Mo) |
| Taille des fichiers et volume transféré | Résumé k6 (`data_sent`, `data_received`) ; colonne `files.size` en base | 10 Mo par fichier ; 325 Mo envoyés et 95 Mo reçus en 1 min |
| Débit | Métriques personnalisées k6 `upload_mo_par_s`, `download_mo_par_s` | ≈ 200 et ≈ 310 Mo/s (local) |
| Mémoire et processeur | `ps` (API), `docker stats` (base) | API : environ 130 Mo stables ; base : environ 35 Mo |
| Poids du site | Sortie de `npm run build` | 88,5 Ko de JavaScript (gzip) |
| Performance perçue | Lighthouse (LCP, TBT, CLS) | LCP 1,7 s (mobile), TBT 40 ms, CLS 0,004 |
| Purge des fichiers expirés | Journal de l'API : `[PurgeService] Purge : N fichier(s) expiré(s) supprimé(s)` | Voir MAINTENANCE.md |

Ces mesures sont à **relancer avant chaque mise en production** et après toute mise à jour importante (Node.js, NestJS, React), puis à comparer à ces valeurs de référence.

## 4. Choix de conception favorables à la performance

| Choix | État | Effet |
|---|---|---|
| Téléversement et téléchargement en flux (*streaming*) | ✅ multer (écriture sur le disque au fil de la réception), `StreamableFile` | Un fichier de 1 Go n'est jamais chargé entièrement en mémoire (mémoire stable, mesurée ci-dessus) |
| Téléchargement confié au navigateur | ✅ formulaire HTML envoyé à l'API | Le fichier est écrit directement sur le disque de l'utilisateur, pas en mémoire dans la page |
| Contrôle de la taille pendant la réception | ✅ 3 niveaux (front, en-tête `Content-Length`, limite de multer) | Arrêt immédiat au-delà de 1 Go, sans attendre la fin de l'envoi |
| Index sur la date d'expiration | ✅ migration `CreateFilesAndTags` | Purge rapide même avec beaucoup de fichiers |
| Jeton de lien unique (`UNIQUE`, donc indexé) | ✅ | Informations d'un lien en 5 ms |
| Statut « expiré » calculé et non stocké | ✅ conception | Aucune mise à jour massive à minuit |
| Site construit et compressé par Vite | ✅ `npm run build` | 129 Ko par page ; fichiers à nom unique, mis en cache par le navigateur |

## 5. Analyse et pistes d'optimisation

Les résultats dépassent largement les besoins d'un MVP : aucune optimisation n'est nécessaire à ce stade. Pistes si l'usage augmente :

| Piste | Quand | Effet attendu |
|---|---|---|
| **Test de forte charge depuis plusieurs adresses** (k6 lancé dans plusieurs conteneurs, ou sur plusieurs machines) | Avant une ouverture au public | Simuler des centaines d'utilisateurs réels sans désactiver la limitation par IP |
| Découper le JavaScript par page (chargement à la demande, `React.lazy`) | Si le site grossit | Lighthouse signale du JavaScript inutilisé sur la première page : chaque page ne chargerait que son code |
| Compression et HTTP/2 par un serveur web (ex. Nginx) devant le site | Mise en production | Pages plus légères sur le réseau, connexions plus efficaces |
| Stockage sur AWS S3, avec liens de téléchargement directs | Plusieurs serveurs ou gros volumes | Les fichiers ne transitent plus par l'API (MAINTENANCE.md) |
| Journaux JSON de l'API (route, code, temps de réponse, taille) centralisés (Loki, Grafana) et métriques (Prometheus) | Mise en production | Suivi continu des temps de réponse et alertes, au lieu de mesures ponctuelles |
