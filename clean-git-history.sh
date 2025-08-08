#!/bin/bash

# Este script elimina las credenciales AWS del historial de git

# Primero, hacemos commit de los cambios actuales que reemplazan las credenciales con placeholders
git add server/.env.dynamo server/start-with-credentials.sh .gitignore
git commit -m "Reemplazar credenciales reales con placeholders y actualizar .gitignore"

# Eliminar credenciales del historial de git
git filter-branch --force --index-filter \
  "git ls-files -z '*env.dynamo' '*credentials.sh' | xargs -0 git update-index --no-skip-worktree" \
  --prune-empty --tag-name-filter cat -- --all

# Forzar el push al repositorio remoto
# git push -f origin main

echo "=========================================================="
echo "El historial de Git ha sido limpiado de credenciales AWS."
echo "Para subir los cambios al repositorio remoto, ejecuta:"
echo "git push -f origin main"
echo "=========================================================="
