# =============================================================================
# Fichier : database/Dockerfile
# Rôle : Image PostgreSQL de DataShare : l'image officielle, sans l'outil
#   « gosu ».
#   gosu sert uniquement, au démarrage, à passer de root à l'utilisateur
#   postgres. trivy y signalait 25 failles (bibliothèque Go avec laquelle il
#   est compilé). Ici, le conteneur démarre DIRECTEMENT sous l'utilisateur
#   postgres : gosu devient inutile, il est supprimé.
#   🔒 Résultat : 0 faille haute ou critique (trivy), et PostgreSQL ne passe
#   jamais par root.
# Utilisé par :
#   - docker-compose.yml (service db)
# =============================================================================
# Image officielle, version précise (PostgreSQL 18.6 sur Alpine 3.24)
FROM postgres:18.6-alpine3.24
# Suppression de gosu (inutile sans démarrage en root)
RUN rm /usr/local/bin/gosu
# Utilisateur postgres de l'image, désigné par son numéro (70) : le script de
# démarrage de l'image, lancé sans root, n'appelle pas gosu
USER 70:70
