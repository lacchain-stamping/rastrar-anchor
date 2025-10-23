#!/bin/bash

# =============================================================================
# Script de Deploy a GitHub con Versionamiento
# Uso: ./deploy.sh [mensaje] [tipo]
# 
# Ejemplos:
#   ./deploy.sh "agregar nueva funcionalidad"
#   ./deploy.sh "corregir bug en validación" fix
#   ./deploy.sh "nueva versión" version
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuración
REPO_URL="https://github.com/lacchain-stamping/rastrar-anchor.git"
BRANCH="main"

# Funciones de impresión
print_message() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        DEPLOY A GITHUB - RASTRAR ANCHOR               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# =============================================================================
# VERIFICACIONES INICIALES
# =============================================================================

# Verificar que estemos en un repositorio git
if [ ! -d .git ]; then
    print_error "No estás en un repositorio Git"
    print_info "Ejecutando git init..."
    
    git init
    git config user.name "lacchain-stamping"
    git config user.email "stamping@lacchain.net"
    git config --global --add safe.directory "$(pwd)"
    git remote add origin "$REPO_URL" 2>/dev/null || true
    git branch -M $BRANCH
    
    print_success "Git inicializado"
fi

# Verificar que tengamos el remote configurado
if ! git remote get-url origin &>/dev/null; then
    print_warning "Remote 'origin' no configurado"
    git remote add origin "$REPO_URL"
    print_success "Remote agregado: $REPO_URL"
fi

# =============================================================================
# VERIFICACIONES DE SEGURIDAD
# =============================================================================

print_message "Verificando seguridad..."

# Verificar que .gitignore existe
if [ ! -f .gitignore ]; then
    print_warning ".gitignore no encontrado, creando..."
    cat > .gitignore << 'GITIGNORE'
# Archivos sensibles
.env
.env.local
.env.*.local
*.key
*.pem
secrets/

# Node
node_modules/
npm-debug.log*

# Datos
data/
db/
*.db
*.sqlite

# Logs
logs/
*.log

# Sistema
.DS_Store
Thumbs.db

# Temporales
tmp/
temp/
*.tmp
GITIGNORE
    print_success ".gitignore creado"
fi

# Verificar que .env NO esté en el stage
if git ls-files --error-unmatch .env &>/dev/null; then
    print_error "¡ALERTA! .env está en el repositorio"
    print_warning "Eliminando .env del tracking..."
    git rm --cached .env
    echo ".env" >> .gitignore
    print_success ".env removido del tracking"
fi

# Buscar claves privadas en el código
print_info "Buscando datos sensibles..."
if grep -r "PRIVATE_KEY.*0x[a-fA-F0-9]\{64\}" --include="*.js" --include="*.json" --exclude-dir={node_modules,dist_node_modules} . 2>/dev/null | grep -v ".example"; then
    print_error "¡ALERTA! Se encontraron claves privadas en el código"
    print_warning "Revisa los archivos antes de continuar"
    read -p "¿Deseas continuar de todos modos? (s/n): " CONTINUE
    if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
        print_error "Deploy cancelado"
        exit 1
    fi
fi

print_success "Verificaciones de seguridad completadas"
echo ""

# =============================================================================
# GESTIÓN DE VERSIONES
# =============================================================================

# Obtener mensaje del commit
COMMIT_MSG="${1:-Update: cambios generales}"
COMMIT_TYPE="${2:-update}"

# Si el tipo es "version", incrementar versión
if [ "$COMMIT_TYPE" == "version" ] || [ "$COMMIT_TYPE" == "v" ]; then
    print_message "Gestionando nueva versión..."
    
    # Leer versión actual de package.json
    if [ -f package.json ]; then
        CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
        print_info "Versión actual: $CURRENT_VERSION"
        
        # Preguntar nueva versión
        read -p "Nueva versión [$CURRENT_VERSION]: " NEW_VERSION
        NEW_VERSION=${NEW_VERSION:-$CURRENT_VERSION}
        
        if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
            # Actualizar package.json
            sed -i "s/\"version\": *\".*\"/\"version\": \"$NEW_VERSION\"/" package.json
            print_success "Versión actualizada a: $NEW_VERSION"
            
            # Crear tag
            git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION" 2>/dev/null || print_warning "Tag ya existe"
            COMMIT_MSG="Release v$NEW_VERSION"
        fi
    else
        print_warning "package.json no encontrado, omitiendo versionamiento"
    fi
fi

# =============================================================================
# ESTADO DEL REPOSITORIO
# =============================================================================

print_message "Estado del repositorio:"
echo ""

# Ver archivos modificados
git status --short

echo ""
print_info "Archivos que se subirán:"
git status --short | head -20

# Contar cambios
MODIFIED=$(git status --short | grep "^ M" | wc -l)
ADDED=$(git status --short | grep "^A\|^??" | wc -l)
DELETED=$(git status --short | grep "^ D" | wc -l)

echo ""
echo "  Modificados: ${YELLOW}$MODIFIED${NC}"
echo "  Agregados: ${GREEN}$ADDED${NC}"
echo "  Eliminados: ${RED}$DELETED${NC}"
echo ""

# Confirmación
read -p "¿Deseas continuar con el deploy? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    print_error "Deploy cancelado"
    exit 0
fi

# =============================================================================
# PROCESO DE COMMIT Y PUSH
# =============================================================================

print_message "Iniciando deploy..."

# Agregar archivos
print_info "Agregando archivos..."
git add .

# Verificar que hay cambios
if git diff --cached --quiet; then
    print_warning "No hay cambios para commitear"
    
    # Preguntar si desea push de todos modos
    read -p "¿Deseas hacer push sin cambios? (s/n): " PUSH_ANYWAY
    if [ "$PUSH_ANYWAY" != "s" ] && [ "$PUSH_ANYWAY" != "S" ]; then
        print_info "Deploy cancelado"
        exit 0
    fi
else
    # Hacer commit
    print_info "Creando commit..."
    git commit -m "$COMMIT_MSG"
    print_success "Commit creado: $COMMIT_MSG"
fi

# Traer cambios remotos
print_info "Sincronizando con GitHub..."
git pull origin $BRANCH --rebase 2>/dev/null || {
    print_warning "Primera subida o conflicto detectado"
    git pull origin $BRANCH --allow-unrelated-histories 2>/dev/null || true
}

# Push
print_info "Subiendo cambios a GitHub..."
if git push origin $BRANCH; then
    print_success "Cambios subidos exitosamente a $BRANCH"
    
    # Push tags si existen
    if git tag -l | grep -q "v"; then
        print_info "Subiendo tags..."
        git push origin --tags 2>/dev/null && print_success "Tags subidos" || print_warning "Tags ya existen en remoto"
    fi
else
    print_error "Error al subir cambios"
    print_warning "Intentando push forzado..."
    
    read -p "¿Deseas forzar el push? Esto sobrescribirá GitHub (s/n): " FORCE
    if [ "$FORCE" == "s" ] || [ "$FORCE" == "S" ]; then
        git push origin $BRANCH --force
        print_success "Push forzado exitoso"
    else
        print_error "Deploy fallido"
        exit 1
    fi
fi

# =============================================================================
# RESUMEN
# =============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║         ✓ DEPLOY COMPLETADO EXITOSAMENTE              ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

print_message "Resumen del deploy:"
echo ""
echo "  📦 Commit: ${CYAN}$COMMIT_MSG${NC}"
echo "  🌿 Rama: ${CYAN}$BRANCH${NC}"
echo "  🔗 Repositorio: ${CYAN}$REPO_URL${NC}"

# Mostrar versión si existe
if [ -f package.json ]; then
    VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
    echo "  🏷️  Versión: ${CYAN}v$VERSION${NC}"
fi

echo ""
echo "  🌐 Ver en GitHub:"
echo "     ${CYAN}https://github.com/lacchain-stamping/rastrar-anchor${NC}"
echo ""

print_success "¡Deploy completado! 🚀"
echo ""

# =============================================================================
# INFORMACIÓN ADICIONAL
# =============================================================================

print_info "Comandos útiles:"
echo ""
echo "  Ver historial:    ${CYAN}git log --oneline${NC}"
echo "  Ver diferencias:  ${CYAN}git diff${NC}"
echo "  Ver ramas:        ${CYAN}git branch -a${NC}"
echo "  Ver tags:         ${CYAN}git tag -l${NC}"
echo ""

# Mostrar último commit
print_info "Último commit:"
git log -1 --pretty=format:"  %h - %s (%cr) <%an>" --abbrev-commit
echo ""
echo ""
