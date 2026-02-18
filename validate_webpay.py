#!/usr/bin/env python3
"""
Script de validación para la integración de Webpay
Verifica que todos los componentes estén correctamente configurados
"""

import os
import sys
import json
from datetime import datetime

def check_file_exists(filepath, name):
    """Verifica que un archivo exista"""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {name}: {filepath}")
    return exists

def check_env_var(var_name, required=False):
    """Verifica una variable de entorno"""
    value = os.environ.get(var_name)
    if value:
        # Ocultar parcialmente valores sensibles
        if 'KEY' in var_name or 'CODE' in var_name:
            display = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "***"
        else:
            display = value
        print(f"✅ {var_name} = {display}")
        return True
    else:
        status = "❌" if required else "⚠️"
        print(f"{status} {var_name} = (no configurada)")
        return not required

def main():
    print("=" * 60)
    print("VALIDACIÓN DE INTEGRACIÓN WEBPAY")
    print("=" * 60)
    print()

    # 1. Verificar archivos backend
    print("📦 ARCHIVOS BACKEND")
    print("-" * 60)
    backend_files = [
        ("backend/tables/webpay.py", "Módulo Webpay"),
        ("backend/tables/orders.py", "Módulo Orders"),
        ("backend/tables/payments.py", "Módulo Payments"),
        ("backend/lambda_function.py", "Lambda Handler"),
        ("backend/requirements.txt", "Requirements"),
        ("backend/dynamodb.yaml", "DynamoDB Template"),
    ]
    
    all_backend_exists = all(check_file_exists(f, n) for f, n in backend_files)
    print()

    # 2. Verificar requirements.txt contiene transbank-sdk
    print("📚 DEPENDENCIAS")
    print("-" * 60)
    try:
        with open('backend/requirements.txt', 'r') as f:
            requirements = f.read()
            has_transbank = 'transbank-sdk' in requirements
            status = "✅" if has_transbank else "❌"
            print(f"{status} transbank-sdk en requirements.txt")
    except:
        print("❌ Error leyendo requirements.txt")
    print()

    # 3. Verificar archivos frontend
    print("🎨 ARCHIVOS FRONTEND")
    print("-" * 60)
    frontend_files = [
        ("frontend/src/pages/Checkout.js", "Página Checkout"),
        ("frontend/src/pages/PaymentSuccess.js", "Página Pago Exitoso"),
        ("frontend/src/pages/PaymentError.js", "Página Pago Error"),
        ("frontend/src/components/PaymentMethodModal.js", "Modal Métodos Pago"),
        ("frontend/src/styles/PaymentResult.css", "Estilos Resultado"),
        ("frontend/src/App.js", "App Router"),
    ]
    
    all_frontend_exists = all(check_file_exists(f, n) for f, n in frontend_files)
    print()

    # 4. Verificar rutas en App.js
    print("🛣️  RUTAS CONFIGURADAS")
    print("-" * 60)
    try:
        with open('frontend/src/App.js', 'r') as f:
            app_content = f.read()
            routes = [
                ('/pago/exito', 'PaymentSuccess'),
                ('/pago/error', 'PaymentError'),
                ('/checkout', 'Checkout'),
            ]
            for route, component in routes:
                has_route = route in app_content and component in app_content
                status = "✅" if has_route else "❌"
                print(f"{status} Ruta {route} → {component}")
    except:
        print("❌ Error leyendo App.js")
    print()

    # 5. Variables de entorno (con valores ejemplo)
    print("🔧 VARIABLES DE ENTORNO")
    print("-" * 60)
    print("Para Lambda en AWS:")
    env_vars = [
        ("ORDERS_TABLE", True, "Tappy_Orders_Dev"),
        ("PAYMENTS_TABLE", True, "Tappy_Payments_Dev"),
        ("API_BASE_URL", True, "https://..."),
        ("APP_BASE_URL", True, "http://localhost:3000"),
        ("TBK_COMMERCE_CODE", False, "597055555532 (test)"),
        ("TBK_API_KEY", False, "579B532A... (test)"),
    ]
    
    for var_name, required, example in env_vars:
        has_var = check_env_var(var_name, required)
        if not has_var:
            print(f"   💡 Ejemplo: {var_name}={example}")
    print()

    # 6. Resumen
    print("=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)
    
    checks = {
        "Archivos Backend": all_backend_exists,
        "Archivos Frontend": all_frontend_exists,
    }
    
    all_passed = all(checks.values())
    
    for check_name, passed in checks.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {check_name}")
    
    print()
    if all_passed:
        print("✅ Todos los archivos están en su lugar!")
        print()
        print("🚀 PRÓXIMOS PASOS:")
        print("1. Configurar variables de entorno en Lambda")
        print("2. Crear tablas DynamoDB (Orders, Payments)")
        print("3. Desplegar Lambda con el código actualizado")
        print("4. Probar flujo completo con tarjeta de prueba")
        print()
        print("📖 Ver WEBPAY_SETUP.md para más detalles")
        return 0
    else:
        print("❌ Faltan algunos archivos o configuraciones")
        print("   Revisa los errores arriba y corrígelos antes de continuar")
        return 1

if __name__ == "__main__":
    sys.exit(main())
