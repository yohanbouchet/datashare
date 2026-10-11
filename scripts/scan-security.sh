#!/usr/bin/env bash
# =============================================================================
# Fichier : scripts/scan-security.sh
# Rôle : Contrôles de sécurité de DataShare, en une commande :
#   1. npm audit : failles connues dans les dépendances (back et front) ;
#   2. trivy : 2e avis sur les dépendances (autre base de failles), à partir
#      des package-lock.json ;
#   3. hadolint : bonnes pratiques de notre Dockerfile (database/) ;
#   4. trivy : failles des images de TOUS les conteneurs en cours
#      d'exécution (aujourd'hui, la base PostgreSQL), pour information
#      (décisions dans SECURITY.md).
#   De nouvelles failles sont publiées chaque jour : le script est à relancer
#   chaque semaine (procédure dans MAINTENANCE.md).
#   trivy et hadolint sont lancés depuis leurs images Docker officielles :
#   rien à installer. Le script échoue (code de sortie 1) si une faille HAUTE
#   ou CRITIQUE est trouvée dans nos dépendances, ou si hadolint fait une
#   remarque : utilisable tel quel dans une intégration continue.
# Usage (depuis n'importe quel dossier) : scripts/scan-security.sh
# Utilise :
#   - backend/, frontend/ (package-lock.json) ; database/Dockerfile ;
#     Docker (conteneurs lancés)
# Utilisé par :
#   - l'administrateur, chaque semaine (MAINTENANCE.md) ; intégration continue
#     (évolution)
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
failed=0

# trivy, version fixée ; le cache des bases de failles est conservé entre deux
# lancements ; seules les failles HIGH et CRITICAL sont signalées, sous forme
# de tableau récapitulatif
TRIVY=(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock
  -v "$PWD:/src:ro" -v "$HOME/.cache/trivy:/root/.cache/"
  aquasec/trivy:0.75.0 --quiet)
OPTIONS=(--scanners vuln --severity "HIGH,CRITICAL" --table-mode summary)

echo "=== 1. npm audit (failles hautes et critiques) ==="
for project in backend frontend; do
  echo "--- $project"
  (cd "$project" && npm audit --audit-level=high) || failed=1
done

echo "=== 2. trivy (dépendances npm) ==="
for project in backend frontend; do
  echo "--- $project/package-lock.json"
  "${TRIVY[@]}" fs "${OPTIONS[@]}" --exit-code 1 "/src/$project/package-lock.json" \
    || failed=1
done

echo "=== 3. hadolint (database/Dockerfile) ==="
docker run --rm -i hadolint/hadolint:v2.14.0 < database/Dockerfile \
  && echo "aucune remarque" || failed=1

echo "=== 4. trivy (images des conteneurs en cours d'exécution) ==="
# docker ps : conteneurs lancés ; sort -u : chaque image une seule fois
images="$(docker ps --format '{{.Image}}' | sort -u)"
if [ -z "$images" ]; then
  echo "Aucun conteneur lancé (démarrer la base : docker compose up -d --wait)"
fi
for image in $images; do
  echo "--- $image (pour information)"
  "${TRIVY[@]}" image "${OPTIONS[@]}" --exit-code 0 "$image"
done

if [ "$failed" -eq 0 ]; then
  echo "✅ Tous les contrôles de sécurité sont passés."
else
  echo "❌ Au moins un contrôle a échoué (voir ci-dessus)." >&2
fi
exit "$failed"
