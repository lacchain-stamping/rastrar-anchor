#!/bin/bash

# =============================================================================
# Rastrar Anchor - Instalador Automático
# Sistema de Anclaje Blockchain para Trazabilidad
# =============================================================================

set -e  # Detener si hay errores

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║           RASTRAR ANCHOR - INSTALADOR                 ║
║     Sistema de Anclaje Blockchain para Trazabilidad  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar si se ejecuta como root
if [ "$EUID" -eq 0 ]; then 
    print_error "No ejecutes este script como root/sudo"
    print_info "Usa tu usuario normal. El script pedirá permisos cuando los necesite"
    exit 1
fi

# =============================================================================
# 1. VERIFICAR REQUISITOS DEL SISTEMA
# =============================================================================

print_message "Verificando requisitos del sistema..."
echo ""

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js instalado: v$NODE_VERSION"
    else
        print_warning "Node.js versión $NODE_VERSION detectada"
        print_warning "Se recomienda Node.js 18 o superior"
    fi
else
    print_error "Node.js no está instalado"
    print_message "Instalando Node.js 18 LTS..."
    
    # Detectar sistema operativo
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        # RedHat/CentOS/Fedora
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        print_error "Sistema operativo no soportado para instalación automática"
        print_info "Por favor instala Node.js 18+ manualmente: https://nodejs.org/"
        exit 1
    fi
    
    print_success "Node.js instalado correctamente"
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm instalado: v$NPM_VERSION"
else
    print_error "npm no está instalado"
    exit 1
fi

# Verificar Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d ' ' -f 3)
    print_success "Git instalado: v$GIT_VERSION"
else
    print_error "Git no está instalado"
    print_message "Instalando Git..."
    
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y git
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y git
    fi
    
    print_success "Git instalado correctamente"
fi

echo ""

# =============================================================================
# 2. CONFIGURACIÓN DE INSTALACIÓN
# =============================================================================

print_message "Configuración de instalación..."
echo ""

# Directorio de instalación por defecto
DEFAULT_INSTALL_DIR="$HOME/rastrar-anchor"

read -p "$(echo -e ${CYAN}Directorio de instalación ${NC}[${DEFAULT_INSTALL_DIR}]: )" INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}

# Puerto por defecto
DEFAULT_PORT="3000"
read -p "$(echo -e ${CYAN}Puerto de la aplicación ${NC}[${DEFAULT_PORT}]: )" APP_PORT
APP_PORT=${APP_PORT:-$DEFAULT_PORT}

echo ""

# =============================================================================
# 3. CLONAR REPOSITORIO
# =============================================================================

print_message "Clonando repositorio desde GitHub..."

if [ -d "$INSTALL_DIR" ]; then
    print_warning "El directorio $INSTALL_DIR ya existe"
    read -p "$(echo -e ${YELLOW}¿Deseas eliminarlo y reinstalar? ${NC}(s/n): )" REINSTALL
    if [ "$REINSTALL" = "s" ] || [ "$REINSTALL" = "S" ]; then
        rm -rf "$INSTALL_DIR"
        print_success "Directorio eliminado"
    else
        print_error "Instalación cancelada"
        exit 1
    fi
fi

# Clonar repositorio
git clone https://github.com/lacchain-stamping/rastrar-anchor.git "$INSTALL_DIR"

if [ $? -ne 0 ]; then
    print_error "Error al clonar el repositorio"
    exit 1
fi

cd "$INSTALL_DIR"
print_success "Repositorio clonado correctamente"

echo ""

# =============================================================================
# 4. INSTALAR DEPENDENCIAS
# =============================================================================

print_message "Instalando dependencias de Node.js..."
print_info "Esto puede tomar varios minutos..."

npm install

if [ $? -ne 0 ]; then
    print_error "Error al instalar dependencias"
    print_info "Intenta ejecutar manualmente: cd $INSTALL_DIR && npm install"
    exit 1
fi

print_success "Dependencias instaladas correctamente"

echo ""

# =============================================================================
# 5. CONFIGURAR VARIABLES DE ENTORNO
# =============================================================================

print_message "Configurando variables de entorno..."

# Verificar si ya existe .env
if [ -f .env ]; then
    print_warning "El archivo .env ya existe"
    read -p "$(echo -e ${YELLOW}¿Deseas hacer backup y crear uno nuevo? ${NC}(s/n): )" BACKUP_ENV
    if [ "$BACKUP_ENV" = "s" ] || [ "$BACKUP_ENV" = "S" ]; then
        mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_success "Backup creado: .env.backup.*"
    else
        print_info "Manteniendo .env existente"
        echo ""
        print_warning "IMPORTANTE: Verifica manualmente que tu .env tenga todas las variables necesarias"
        SKIP_ENV_CONFIG=true
    fi
fi

if [ "$SKIP_ENV_CONFIG" != true ]; then
    cat > .env << EOF
# =============================================================================
# CONFIGURACIÓN DE LA API
# =============================================================================

# Puerto del servidor
PORT=$APP_PORT

# Token de autenticación para endpoints protegidos
# Genera uno seguro con: openssl rand -hex 32
X_TOKEN_API=

# =============================================================================
# CONFIGURACIÓN DE BLOCKCHAIN
# =============================================================================

# URL del nodo RPC
# Celo Alfajores (testnet): https://alfajores-forno.celo-testnet.org
# Celo Mainnet: https://forno.celo.org
RPC_URL=https://alfajores-forno.celo-testnet.org

# ID de la cadena blockchain
# Celo Alfajores: 44787
# Celo Mainnet: 42220
CHAIN_ID=44787

# URL del explorador de blockchain
# Celo Alfajores: https://alfajores.celoscan.io
# Celo Mainnet: https://celoscan.io
EXPLORER_URL=https://alfajores.celoscan.io

# Clave privada de la wallet (¡NUNCA COMPARTAS ESTO!)
# Genera una nueva wallet con: npm run generate-wallet
PRIVATE_KEY=

# Dirección del contrato inteligente desplegado
# Déjalo vacío si aún no has desplegado el contrato
# Luego usa el endpoint POST /createContract para desplegarlo
CONTRACT_ADDRESS=

# =============================================================================
# CONFIGURACIÓN DE IPFS
# =============================================================================

# Tipo de endpoint IPFS (local, remote)
IPFS_ENDPOINT=local

# Gateway público de IPFS para acceder a los archivos
IPFS_GATEWAY=https://gateway.pinata.cloud

# Pinata (Servicio IPFS en la nube - Opcional)
PINATA_ENABLED=false
PINATA_JWT=

# =============================================================================
# CONFIGURACIÓN DE BASE DE DATOS Y ALMACENAMIENTO
# =============================================================================

# Rutas de almacenamiento local
DB_PATH=./data/db
IPFS_PATH=./data/ipfs

# =============================================================================
# LOGS Y DEBUGGING
# =============================================================================

LOG_LEVEL=info
LOG_PATH=./logs
EOF

    print_success "Archivo .env creado"
    echo ""
    print_warning "════════════════════════════════════════════════════"
    print_warning "¡IMPORTANTE! Configura estas variables obligatorias:"
    print_warning "════════════════════════════════════════════════════"
    echo ""
    echo "  ${YELLOW}1. X_TOKEN_API${NC} - Token de seguridad para la API"
    echo "     ${CYAN}openssl rand -hex 32${NC}"
    echo ""
    echo "  ${YELLOW}2. PRIVATE_KEY${NC} - Clave privada de tu wallet blockchain"
    echo "     ${CYAN}cd $INSTALL_DIR && npm run generate-wallet${NC}"
    echo ""
    print_info "Edita el archivo: ${CYAN}nano $INSTALL_DIR/.env${NC}"
    echo ""
fi

# =============================================================================
# 6. CREAR ESTRUCTURA DE DIRECTORIOS
# =============================================================================

print_message "Creando estructura de directorios..."

mkdir -p data/ipfs
mkdir -p data/db
mkdir -p logs

print_success "Directorios creados"

echo ""

# =============================================================================
# 7. CONFIGURAR SERVICIO SYSTEMD (Opcional)
# =============================================================================

read -p "$(echo -e ${CYAN}¿Configurar como servicio systemd (inicio automático)? ${NC}(s/n): )" SETUP_SERVICE

if [ "$SETUP_SERVICE" = "s" ] || [ "$SETUP_SERVICE" = "S" ]; then
    print_message "Configurando servicio systemd..."
    
    SERVICE_NAME="rastrar-anchor"
    SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
    
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=Rastrar Anchor - Sistema de Anclaje Blockchain
Documentation=https://github.com/lacchain-stamping/rastrar-anchor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/src/index.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/output.log
StandardError=append:$INSTALL_DIR/logs/error.log

# Variables de entorno
Environment=NODE_ENV=production

# Límites de recursos
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    
    print_success "Servicio systemd configurado: $SERVICE_NAME"
    echo ""
    print_info "Comandos útiles del servicio:"
    echo "  ${CYAN}sudo systemctl start $SERVICE_NAME${NC}      # Iniciar"
    echo "  ${CYAN}sudo systemctl stop $SERVICE_NAME${NC}       # Detener"
    echo "  ${CYAN}sudo systemctl restart $SERVICE_NAME${NC}    # Reiniciar"
    echo "  ${CYAN}sudo systemctl status $SERVICE_NAME${NC}     # Ver estado"
    echo "  ${CYAN}sudo journalctl -u $SERVICE_NAME -f${NC}     # Ver logs en vivo"
    echo ""
fi

# =============================================================================
# 8. CONFIGURAR NGINX (Opcional)
# =============================================================================

read -p "$(echo -e ${CYAN}¿Configurar Nginx como proxy inverso? ${NC}(s/n): )" SETUP_NGINX

if [ "$SETUP_NGINX" = "s" ] || [ "$SETUP_NGINX" = "S" ]; then
    print_message "Configurando Nginx..."
    
    # Verificar si Nginx está instalado
    if ! command -v nginx &> /dev/null; then
        print_message "Instalando Nginx..."
        if [ -f /etc/debian_version ]; then
            sudo apt-get update
            sudo apt-get install -y nginx
        elif [ -f /etc/redhat-release ]; then
            sudo yum install -y nginx
        fi
        print_success "Nginx instalado"
    fi
    
    read -p "$(echo -e ${CYAN}Dominio o subdominio ${NC}(ej: api.rastrar.com): )" DOMAIN
    
    NGINX_CONF="/etc/nginx/sites-available/rastrar-anchor"
    
    sudo tee $NGINX_CONF > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Logs
    access_log /var/log/nginx/rastrar-anchor.access.log;
    error_log /var/log/nginx/rastrar-anchor.error.log;

    # Configuración de proxy
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Límite de tamaño de body (ajustar según necesidad)
    client_max_body_size 10M;
}
EOF

    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        sudo systemctl restart nginx
        print_success "Nginx configurado correctamente"
        echo ""
        print_info "Tu API estará disponible en: ${CYAN}http://$DOMAIN${NC}"
        echo ""
        print_info "Para habilitar HTTPS con Let's Encrypt:"
        echo "  ${CYAN}sudo apt-get install certbot python3-certbot-nginx${NC}"
        echo "  ${CYAN}sudo certbot --nginx -d $DOMAIN${NC}"
    else
        print_error "Error en la configuración de Nginx"
        print_info "Revisa el archivo: $NGINX_CONF"
    fi
    echo ""
fi

# =============================================================================
# 9. RESUMEN DE INSTALACIÓN
# =============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║         ✓ INSTALACIÓN COMPLETADA EXITOSAMENTE         ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

print_message "📊 Resumen de instalación:"
echo ""
echo "  📁 Directorio: ${CYAN}$INSTALL_DIR${NC}"
echo "  🌐 Puerto: ${CYAN}$APP_PORT${NC}"
echo "  📄 Configuración: ${CYAN}$INSTALL_DIR/.env${NC}"
echo "  📝 Logs: ${CYAN}$INSTALL_DIR/logs/${NC}"
echo "  📦 Repositorio: ${CYAN}https://github.com/lacchain-stamping/rastrar-anchor${NC}"
echo ""

print_warning "════════════════════════════════════════════════════════════════"
print_warning "  PRÓXIMOS PASOS OBLIGATORIOS"
print_warning "════════════════════════════════════════════════════════════════"
echo ""

echo "${YELLOW}1️⃣  Configurar variables de entorno:${NC}"
echo "   ${CYAN}nano $INSTALL_DIR/.env${NC}"
echo ""
echo "   📝 Variables obligatorias:"
echo "   • ${YELLOW}X_TOKEN_API${NC} → Genera con: ${CYAN}openssl rand -hex 32${NC}"
echo "   • ${YELLOW}PRIVATE_KEY${NC} → Genera con: ${CYAN}cd $INSTALL_DIR && npm run generate-wallet${NC}"
echo ""

echo "${YELLOW}2️⃣  Obtener fondos de prueba (testnet):${NC}"
echo "   • Copia tu dirección (address) del generate-wallet"
echo "   • Faucet Celo Alfajores: ${CYAN}https://faucet.celo.org/alfajores${NC}"
echo "   • Espera unos segundos para recibir fondos"
echo ""

echo "${YELLOW}3️⃣  Iniciar la aplicación:${NC}"
if [ "$SETUP_SERVICE" = "s" ] || [ "$SETUP_SERVICE" = "S" ]; then
    echo "   ${CYAN}sudo systemctl start rastrar-anchor${NC}"
    echo "   ${CYAN}sudo systemctl status rastrar-anchor${NC}"
else
    echo "   ${CYAN}cd $INSTALL_DIR${NC}"
    echo "   ${CYAN}npm start${NC}"
    echo ""
    echo "   O en segundo plano con PM2:"
    echo "   ${CYAN}npm install -g pm2${NC}"
    echo "   ${CYAN}pm2 start src/index.js --name rastrar-anchor${NC}"
fi
echo ""

echo "${YELLOW}4️⃣  Verificar que funciona:${NC}"
echo "   ${CYAN}curl http://localhost:$APP_PORT/health${NC}"
echo ""

echo "${YELLOW}5️⃣  Desplegar contrato inteligente:${NC}"
echo "   ${CYAN}curl -X POST http://localhost:$APP_PORT/createContract \\${NC}"
echo "   ${CYAN}  -H \"X-Token-API: tu_token\" \\${NC}"
echo "   ${CYAN}  -H \"Content-Type: application/json\"${NC}"
echo ""

print_info "════════════════════════════════════════════════════════════════"
print_info "  📚 DOCUMENTACIÓN Y SOPORTE"
print_info "════════════════════════════════════════════════════════════════"
echo ""
echo "  📖 README: ${CYAN}$INSTALL_DIR/README.md${NC}"
echo "  🔗 GitHub: ${CYAN}https://github.com/lacchain-stamping/rastrar-anchor${NC}"
echo "  🐛 Issues: ${CYAN}https://github.com/lacchain-stamping/rastrar-anchor/issues${NC}"
echo "  📘 API Docs: Revisa el archivo API_DOCS.md"
echo ""

print_success "════════════════════════════════════════════════════════════════"
print_success "  ¡Instalación completada exitosamente! 🎉"
print_success "════════════════════════════════════════════════════════════════"
echo ""