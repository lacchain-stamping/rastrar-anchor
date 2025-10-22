# Dockerfile para Rastrar API
FROM node:18-alpine

# Información del mantenedor
LABEL maintainer="rastrar@example.com"
LABEL description="Sistema de trazabilidad con blockchain e IPFS"

# Instalar dependencias del sistema
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p data/ipfs data/db logs

# Establecer permisos
RUN chown -R node:node /app

# Usar usuario no-root
USER node

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]