#!/bin/bash

# Establecer perfil AWS
export AWS_PROFILE=tappy
export AWS_REGION=us-east-1

echo "📊 Configurando tablas de DynamoDB con perfil: $AWS_PROFILE"
echo ""

# Ejecutar el script de configuración de DynamoDB
cd /Users/andrewwar29/Documents/Tappy/Proyecto/tappy/server
node setup-dynamodb.js
