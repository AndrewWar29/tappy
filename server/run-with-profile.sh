#!/bin/bash

# Script para ejecutar el servidor con un perfil de AWS específico
PROFILE=${1:-tappy}

echo "🚀 Iniciando servidor con perfil AWS: $PROFILE"
echo ""

# Exportar las variables de entorno
export AWS_PROFILE=$PROFILE

# Ejecutar el servidor
cd /Users/andrewwar29/Documents/Tappy/Proyecto/tappy/server
node serverDynamoDB.js
