# 🚀 Rastrar API - Sistema de Trazabilidad Blockchain

Sistema completo de trazabilidad con registro en blockchain (EPCIS) y almacenamiento descentralizado (IPFS).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 📋 Características

- ✅ Registro de usuarios con credenciales blockchain
- ✅ Gestión de cadenas productivas y trazabilidad
- ✅ Certificados digitales inmutables en blockchain
- ✅ Almacenamiento descentralizado con IPFS
- ✅ Integración opcional con Pinata
- ✅ API RESTful completa
- ✅ Soporte para múltiples redes blockchain (Celo, Polygon, Ethereum)

---

## ⚡ Instalación Rápida

### Método 1: Instalador Automático (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/install.sh | bash
```

O descarga y ejecuta:

```bash
wget https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/install.sh
chmod +x install.sh
./install.sh
```

El instalador automáticamente:
- ✅ Verifica e instala dependencias (Node.js, npm, git)
- ✅ Clona el repositorio
- ✅ Instala paquetes npm
- ✅ Crea estructura de directorios
- ✅ Configura archivo .env
- ✅ (Opcional) Configura servicio systemd
- ✅ (Opcional) Configura Nginx como proxy inverso

---

### Método 2: Instalación Manual

**1. Requisitos previos:**
- Node.js 18 o superior
- npm 9 o superior
- Git

**2. Clonar repositorio:**
```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

**3. Instalar dependencias:**
```bash
npm install
```

**4. Configurar variables de entorno:**
```bash
cp .env.example .env
nano .env
```

**5. Crear estructura de directorios:**
```bash
mkdir -p data/{db,ipfs} logs
```

**6. Iniciar aplicación:**
```bash
npm start
```

---

## 🔧 Configuración

### Variables de Entorno

Edita el archivo `.env` con tus configuraciones:

```env
# Servidor
PORT=3000
NODE_ENV=production

# Blockchain
RPC_URL=https://alfajores-forno.celo-testnet.org
CHAIN_ID=44787
EXPLORER_URL=https://alfajores.celoscan.io
PRIVATE_KEY=tu_clave_privada_aqui

# Seguridad
X_TOKEN_API=tu_token_seguro_aqui

# IPFS
IPFS_ENDPOINT=local
IPFS_GATEWAY=https://gateway.pinata.cloud

# Pinata (Opcional)
PINATA_ENABLED=false
PINATA_JWT=tu_jwt_pinata
```

### Obtener Clave Privada

**Opción 1: Crear nueva wallet**
```bash
npm run generate-wallet
```

**Opción 2: Usar MetaMask**
1. Abre MetaMask
2. Click en los tres puntos → Detalles de cuenta
3. Exportar clave privada

⚠️ **IMPORTANTE**: Nunca compartas tu clave privada ni la subas a GitHub

### Obtener Fondos de Prueba

**Celo Alfajores:**
- Faucet: https://faucet.celo.org/alfajores
- Necesitas CELO de prueba para transacciones

**Polygon Mumbai:**
- Faucet: https://faucet.polygon.technology

---

## 📚 Documentación API

### Endpoints Principales

**Usuarios:**
- `POST /api/useraccess/register/` - Registrar usuario
- `POST /api/useraccess/refresh/` - Actualizar tracer
- `GET /api/useraccess/stats/` - Estadísticas de usuarios

**Metadata:**
- `GET /api/metadata/?type=chains` - Cadenas productivas
- `GET /api/metadata/?type=forms` - Formularios
- `GET /api/metadata/?type=trace_schemas` - Esquemas

**Blockchain:**
- `POST /setup` - Configurar blockchain
- `POST /createContract` - Desplegar contrato
- `POST /event` - Registrar certificado
- `GET /registry?cid=...` - Consultar certificado
- `POST /changestatus` - Cambiar estado

**IPFS:**
- `GET /ipfs/:cid` - Ver contenido
- `POST /ipfs/:cid` - Pinear en Pinata

📖 **Documentación completa:** [Ver API_DOCS.md](./API_DOCS.md)

---

## 🚀 Uso Rápido

### 1. Registrar un usuario

```bash
curl -X POST http://localhost:3000/api/useraccess/register/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer rastrar_secure_token_2024_export_system" \
  -d '{
    "chains": ["PCH001"],
    "actors": ["a2"],
    "user_data": {
      "name": "Juan",
      "paternal_surname": "Pérez",
      "company_identifier": "20987654321",
      "region": "Loreto"
    }
  }'
```

### 2. Registrar un certificado

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token" \
  -d '{
    "transaction": {
      "type": "ObjectEvent",
      "eventTime": "2025-10-22T10:00:00Z",
      "action": "OBSERVE",
      "bizStep": "shipping",
      "epcList": ["urn:epc:id:sgtin:7501234.test.001"]
    },
    "validTo": "2026-10-22T10:00:00Z"
  }'
```

### 3. Consultar certificado

```bash
curl "http://localhost:3000/registry?cid=QmYwAPJzv..." \
  -H "X-Token-API: tu-token"
```

---

## 🛠️ Comandos Útiles

### Desarrollo

```bash
npm run dev          # Modo desarrollo con hot-reload
npm start            # Iniciar en producción
npm test             # Ejecutar tests
npm run lint         # Verificar código
```

### Servicio (si instalaste con systemd)

```bash
sudo systemctl start rastrar-api      # Iniciar
sudo systemctl stop rastrar-api       # Detener
sudo systemctl restart rastrar-api    # Reiniciar
sudo systemctl status rastrar-api     # Ver estado
sudo journalctl -u rastrar-api -f     # Ver logs en tiempo real
```

### Logs

```bash
# Ver logs de la aplicación
tail -f logs/output.log
tail -f logs/error.log

# Ver últimas 100 líneas
tail -n 100 logs/output.log
```

---

## 📦 Estructura del Proyecto

```
rastrar-api/
├── src/
│   ├── index.js              # Punto de entrada
│   ├── routes/               # Rutas de la API
│   ├── services/             # Lógica de negocio
│   ├── middleware/           # Middlewares
│   └── contracts/            # Smart contracts
├── data/
│   ├── db/                   # Base de datos local
│   └── ipfs/                 # Almacenamiento IPFS
├── logs/                     # Logs de la aplicación
├── .env                      # Variables de entorno
├── .env.example              # Ejemplo de configuración
├── install.sh                # Instalador automático
├── package.json              # Dependencias
└── README.md                 # Este archivo
```

---

## 🔐 Seguridad

### Buenas Prácticas

✅ **Hacer:**
- Usa HTTPS en producción
- Mantén las claves privadas seguras
- Cambia los tokens por defecto
- Actualiza dependencias regularmente
- Configura firewall apropiadamente
- Usa variables de entorno para secretos

❌ **No hacer:**
- No subas `.env` a Git
- No uses claves privadas en código
- No expongas puertos innecesarios
- No uses permisos 777
- No compartas tokens de API

### Archivo .gitignore

```gitignore
# Archivos sensibles
.env
.env.local
.env.*.local

# Datos
data/
logs/

# Node
node_modules/
npm-debug.log*

# Sistema
.DS_Store
Thumbs.db
```

---

## 🌐 Despliegue

### Con PM2 (Recomendado para producción)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start src/index.js --name rastrar-api

# Comandos útiles
pm2 status                    # Ver estado
pm2 logs rastrar-api          # Ver logs
pm2 restart rastrar-api       # Reiniciar
pm2 stop rastrar-api          # Detener
pm2 delete rastrar-api        # Eliminar

# Iniciar al arranque del sistema
pm2 startup
pm2 save
```

### Con Docker

```bash
# Construir imagen
docker build -t rastrar-api .

# Ejecutar contenedor
docker run -d \
  --name rastrar-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  rastrar-api
```

### Nginx como Proxy Inverso

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "EADDRINUSE: address already in use"
```bash
# Ver qué proceso usa el puerto
lsof -i :3000
# Matar proceso
kill -9 PID
```

### Error: "Insufficient funds"
```bash
# Obtén fondos de prueba del faucet correspondiente
# Celo: https://faucet.celo.org/alfajores
# Polygon: https://faucet.polygon.technology
```

### Error de permisos en carpeta data/
```bash
sudo chown -R $USER:$USER data/
chmod -R 755 data/
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

- 📧 Email: soporte@rastrar.com
- 📚 Documentación: https://docs.rastrar.com
- 🐛 Issues: https://github.com/TU_USUARIO/TU_REPO/issues

---

## 🙏 Agradecimientos

- [Ethers.js](https://docs.ethers.org/) - Interacción con blockchain
- [Helia](https://github.com/ipfs/helia) - Cliente IPFS
- [Express](https://expressjs.com/) - Framework web
- [Pinata](https://www.pinata.cloud/) - Servicio IPFS

---

## 📊 Estado del Proyecto

![GitHub stars](https://img.shields.io/github/stars/TU_USUARIO/TU_REPO)
![GitHub forks](https://img.shields.io/github/forks/TU_USUARIO/TU_REPO)
![GitHub issues](https://img.shields.io/github/issues/TU_USUARIO/TU_REPO)

**Versión actual:** 1.0.0

**Última actualización:** Octubre 2025
