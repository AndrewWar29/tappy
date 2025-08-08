#!/bin/bash

# Este script elimina completamente los archivos con credenciales del historial de git

# Crear una rama temporal
git checkout -b temp_clean_branch

# Verificar que los archivos están limpios ahora
git add server/.env.dynamo server/start-with-credentials.sh .gitignore
git commit -m "Archivos con credenciales limpias"

# Crear un nuevo repositorio desde cero
echo "Creando un nuevo repositorio limpio..."
cd ..
rm -rf tappy_clean
mkdir tappy_clean
cd tappy_clean
git init

# Añadir el repositorio original como remoto
git remote add origin ../tappy

# Traer solo los archivos actuales, sin historial
git fetch origin temp_clean_branch
git checkout -b main FETCH_HEAD

# Opcionalmente, añadir el remoto de GitHub
echo "¿Quieres configurar el remoto de GitHub? (s/n)"
read respuesta
if [ "$respuesta" = "s" ]; then
  git remote remove origin
  git remote add origin https://github.com/AndrewWar29/tappy.git
  echo "Para subir los cambios al repositorio remoto, ejecuta:"
  echo "git push -f origin main"
fi

echo "Repositorio limpiado correctamente en: ../tappy_clean"
echo "Puedes verificar que los archivos sensibles han sido eliminados y luego:"
echo "1. Renombrar el nuevo directorio: mv ../tappy_clean ../tappy_new"
echo "2. Eliminar el viejo: rm -rf ../tappy"
echo "3. Renombrar el nuevo: mv ../tappy_new ../tappy"
