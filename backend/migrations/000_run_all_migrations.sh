#!/bin/bash
# ============================================================================
# Script para ejecutar todas las migraciones en orden
# ============================================================================
# Este script se ejecuta automáticamente cuando Postgres inicia por primera vez
# gracias a que está montado en /docker-entrypoint-initdb.d
#
# ¿Por qué necesitamos esto?
# Postgres ejecuta archivos en orden alfabético, pero queremos asegurarnos
# de que las migraciones se ejecuten en el orden correcto (001, 002, 003...)
# ============================================================================

set -e  # Si cualquier comando falla, detener el script inmediatamente

echo "============================================"
echo "🚀 Iniciando migraciones de base de datos"
echo "============================================"

# Directorio donde están las migraciones (dentro del contenedor)
MIGRATIONS_DIR="/docker-entrypoint-initdb.d"

# Ejecutar todas las migraciones .up.sql en orden numérico
for migration in $(ls -1 ${MIGRATIONS_DIR}/*.up.sql 2>/dev/null | sort); do
    echo "📄 Ejecutando: $(basename $migration)"
    
    # Ejecutar el archivo SQL
    # -U: usuario de Postgres
    # -d: nombre de la base de datos
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
    
    # Verificar si se ejecutó correctamente
    if [ $? -eq 0 ]; then
        echo "✅ $(basename $migration) ejecutado correctamente"
    else
        echo "❌ Error al ejecutar $(basename $migration)"
        exit 1
    fi
done

echo ""
echo "============================================"
echo "✅ Todas las migraciones completadas"
echo "============================================"
