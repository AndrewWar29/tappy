#!/bin/bash

# Script para iniciar el servidor con .env específico
cd /Users/andrewwar29/Documents/Tappy/Proyecto/tappy/server

# Copiar el archivo .env.dynamo a .env
cp .env.dynamo .env

# Iniciar el servidor
echo "🚀 Iniciando servidor con credenciales de .env.dynamo"
node serverDynamoDB.js
