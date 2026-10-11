#!/usr/bin/env bash
# =============================================================================
# Fichier : scripts/scan-security.sh
# Rôle : Contrôles de sécurité de DataShare, en une commande :
#   1. npm audit : failles connues dans les dépendances (back et front) ;
#   2. trivy : 2e avis sur les dépendances (autre base de failles), à partir
#      des package-lock.json ;
#   3. trivy : failles de l'image Docker officielle de PostgreSQL (pour
#      information, décision dans SECURITY.md).
#   hadolint n'est pas utilisé : le projet n'a pas de Dockerfile (la base
#   utilise l'image officielle telle quelle).
#   trivy est lancé depuis son image Docker officielle : rien à installer.
#   Le script échoue (code de sortie 1) si une faille HAUTE ou CRITIQUE est
#   trouvée dans nos dépendances : utilisable tel quel dans une intégration
#   continue.
# Usage (depuis n'importe quel dossier) : scripts/scan-security.sh
# Utilise :
#   - backend/, frontend/ (package-lock.json) ; docker-compose.yml (image db)
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
failed=0

# trivy, version fixée ; le cache des bases de failles est conservé entre deux
# lancements ; seules les failles HIGH et CRITICAL sont signalées
TRIVY=(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock
  -v "$PWD:/src:ro" -v "$HOME/.cache/trivy:/root/.cache/"
  aquasec/trivy:0.75.0 --quiet)
SEVERITY=(--scanners vuln --severity "HIGH,CRITICAL")

echo "=== 1. npm audit (failles hautes et critiques) ==="
for project in backend frontend; do
  echo "--- $project"
  (cd "$project" && npm audit --audit-level=high) || failed=1
done

echo "=== 2. trivy (dépendances npm) ==="
for project in backend frontend; do
  echo "--- $project/package-lock.json"
  "${TRIVY[@]}" fs "${SEVERITY[@]}" --exit-code 1 "/src/$project/package-lock.json" \
    && echo "aucune faille haute ou critique" || failed=1
done

echo "=== 3. trivy (image postgres:18-alpine, pour information) ==="
"${TRIVY[@]}" image "${SEVERITY[@]}" --exit-code 0 postgres:18-alpine \
  | grep -E "Total|alpine|gosu" || true

if [ "$failed" -eq 0 ]; then
  echo "✅ Tous les contrôles de sécurité sont passés."
else
  echo "❌ Au moins un contrôle a échoué (voir ci-dessus)." >&2
fi
exit "$failed"
