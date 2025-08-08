#!/bin/bash

# Script para configurar AWS para este proyecto
echo "Configurando AWS para el proyecto Tappy..."

# Crear archivo de configuración temporal
CONFIG_FILE=$(mktemp)
CREDS_FILE=$(mktemp)

cat > $CONFIG_FILE << EOF
[profile tappy]
region = us-east-1
output = json
EOF

cat > $CREDS_FILE << EOF
[tappy]
aws_access_key_id = 
aws_secret_access_key = 
EOF

# Solicitar credenciales al usuario
echo ""
echo "Por favor ingresa tus credenciales de AWS para el proyecto Tappy:"
read -p "AWS Access Key ID: " ACCESS_KEY
read -p "AWS Secret Access Key: " SECRET_KEY

# Reemplazar en el archivo de credenciales
sed -i '' "s/aws_access_key_id = /aws_access_key_id = $ACCESS_KEY/" $CREDS_FILE
sed -i '' "s/aws_secret_access_key = /aws_secret_access_key = $SECRET_KEY/" $CREDS_FILE

# Verificar si existen los directorios
mkdir -p ~/.aws

# Agregar el nuevo perfil a los archivos de configuración existentes
if [ -f ~/.aws/config ]; then
  # Comprobar si el perfil ya existe
  if grep -q "\[profile tappy\]" ~/.aws/config; then
    echo "El perfil [tappy] ya existe en ~/.aws/config"
  else
    cat $CONFIG_FILE >> ~/.aws/config
    echo "Perfil [tappy] agregado a ~/.aws/config"
  fi
else
  cp $CONFIG_FILE ~/.aws/config
  echo "Archivo ~/.aws/config creado con el perfil [tappy]"
fi

if [ -f ~/.aws/credentials ]; then
  # Comprobar si las credenciales ya existen
  if grep -q "\[tappy\]" ~/.aws/credentials; then
    echo "Las credenciales [tappy] ya existen en ~/.aws/credentials"
    read -p "¿Deseas sobrescribirlas? (s/n): " OVERWRITE
    if [ "$OVERWRITE" = "s" ] || [ "$OVERWRITE" = "S" ]; then
      # Extraer el bloque existente y reemplazarlo
      sed -i '' "/\[tappy\]/,/^\[/s/aws_access_key_id.*/aws_access_key_id = $ACCESS_KEY/" ~/.aws/credentials
      sed -i '' "/\[tappy\]/,/^\[/s/aws_secret_access_key.*/aws_secret_access_key = $SECRET_KEY/" ~/.aws/credentials
      echo "Credenciales [tappy] actualizadas en ~/.aws/credentials"
    fi
  else
    cat $CREDS_FILE >> ~/.aws/credentials
    echo "Credenciales [tappy] agregadas a ~/.aws/credentials"
  fi
else
  cp $CREDS_FILE ~/.aws/credentials
  echo "Archivo ~/.aws/credentials creado con credenciales [tappy]"
fi

# Limpiar archivos temporales
rm $CONFIG_FILE
rm $CREDS_FILE

echo ""
echo "✅ Configuración de AWS completada para el proyecto Tappy"
echo "Para usar este perfil, ejecuta: AWS_PROFILE=tappy <comando>"
echo "O usa los scripts: npm run start:dynamo:profile"
