#!/usr/bin/env bash
# =============================================================================
# Fichier : scripts/deploy.sh
# Rôle : Script de déploiement de DataShare (installation et configuration de
#   la base de données), en une commande, sur une machine qui vient de cloner
#   le dépôt :
#   1. vérifie les prérequis (Node.js 24, npm, Docker, Docker Compose,
#      openssl) ;
#   2. crée les fichiers .env s'ils n'existent pas, à partir des modèles
#      .env.example ; 🔒 le mot de passe de la base et la clé JWT sont générés
#      ALÉATOIREMENT (jamais de secret par défaut) ;
#   3. installe les dépendances du back et du front (versions exactes du
#      package-lock.json) ;
#   4. démarre PostgreSQL et attend qu'il soit prêt ;
#   5. crée ou met à jour les tables (migrations) ;
#   6. affiche les commandes de lancement.
#   Relançable sans risque : un .env existant n'est jamais modifié, et seules
#   les migrations en attente sont appliquées (mise à jour après un git pull).
# Usage (depuis n'importe quel dossier) : scripts/deploy.sh
# Utilise :
#   - .env.example, frontend/.env.example, docker-compose.yml
#   - backend/package.json (script migration:run)
# =============================================================================
# -e : arrêt à la 1re erreur ; -u : variable inconnue = erreur ; pipefail :
# une erreur dans un enchaînement de commandes (|) n'est pas masquée
set -euo pipefail

# Toujours travailler depuis la racine du projet, d'où que le script soit lancé
cd "$(dirname "$0")/.."

# 1. Prérequis
echo "▶ 1/5 Vérification des prérequis"
for tool in node npm docker openssl; do
  command -v "$tool" >/dev/null || { echo "❌ $tool est requis (voir README)." >&2; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose v2 est requis." >&2; exit 1; }
# Version majeure de Node.js : "v24.21.0" → 24
NODE_MAJOR="$(node --version | cut -d. -f1 | tr -d v)"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "❌ Node.js 24 ou plus est requis (version actuelle : $(node --version))." >&2
  exit 1
fi

# 2. Fichiers de configuration : créés une seule fois
echo "▶ 2/5 Configuration (.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  # 🔒 Droits restreints : seul le propriétaire peut lire les secrets
  chmod 600 .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
  echo "   .env créé (mot de passe de la base et clé JWT aléatoires)"
else
  echo "   .env existant conservé"
fi
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo "   frontend/.env créé"
fi

# 3. Dépendances (npm ci : versions exactes du package-lock.json)
echo "▶ 3/5 Installation des dépendances"
(cd backend && npm ci)
(cd frontend && npm ci)

# 4. Base de données : démarrage et attente du healthcheck
echo "▶ 4/5 Démarrage de PostgreSQL"
docker compose up -d --wait

# 5. Tables : migrations versionnées (seules celles en attente sont appliquées)
echo "▶ 5/5 Migrations de la base"
(cd backend && npm run migration:run)

echo "✅ Installation terminée. Pour lancer l'application (2 terminaux) :"
echo "   cd backend && npm run start:dev    → API : http://localhost:3000/api"
echo "   cd frontend && npm run dev         → site : http://localhost:5173"
