#!/bin/bash

# Este script crea un nuevo historial de git sin las credenciales

# Aseguramos que tenemos los cambios actuales guardados
git add .
git commit -m "Archivos con credenciales limpias"

# Crear una rama temporal con solo el estado actual
git checkout --orphan temp_clean_branch
git add .
git commit -m "Versión limpia del código sin credenciales en el historial"

# Eliminar la rama principal y renombrar la temporal
git branch -D main
git branch -m main

echo "=============================================================="
echo "Se ha creado un nuevo historial limpio en la rama main."
echo "Verifica que todo esté correcto y luego ejecuta:"
echo "git push -f origin main"
echo "=============================================================="
