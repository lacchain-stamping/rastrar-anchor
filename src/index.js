import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import setupRoutes from './routes/setup.js';
import eventRoutes from './routes/event.js';
import registryRoutes from './routes/registry.js';
import changeStatusRoutes from './routes/changeStatus.js';
import contractRoutes from './routes/contract.js';
import ipfsRoutes from './routes/ipfs.js';
import ipfsService from './services/ipfsService.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por ventana
});
app.use(limiter);

// Rutas públicas (sin autenticación)
app.use('/setup', setupRoutes);

// Ruta GET de IPFS es pública
app.get('/ipfs/:cid', async (req, res, next) => {
  // Importar dinámicamente para evitar problemas circulares
  const { default: ipfsService } = await import('./services/ipfsService.js');
  
  try {
    const { cid } = req.params;
    
    if (!cid || !cid.startsWith('Qm')) {
      return res.status(400).json({
        success: false,
        error: 'CID inválido'
      });
    }
    
    const data = await ipfsService.getJSON(cid);
    
    res.json({
      success: true,
      cid,
      data,
      source: 'local',
      gatewayUrl: ipfsService.getGatewayURL(cid)
    });
    
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'CID no encontrado',
      details: error.message
    });
  }
});

// Middleware de autenticación para rutas protegidas
app.use(authMiddleware);

// Rutas protegidas
app.use('/event', eventRoutes);
app.use('/registry', registryRoutes);
app.use('/changestatus', changeStatusRoutes);
app.use('/createContract', contractRoutes);
app.use('/ipfs', ipfsRoutes); // POST /ipfs/:cid requiere autenticación

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Función para mostrar información del servidor
const showServerInfo = async () => {
  console.log(`📝 Endpoints disponibles:`);
  console.log(`   POST /setup - Configuración inicial`);
  console.log(`   POST /event - Registrar evento`);
  console.log(`   POST /changestatus - Cambiar estado`);
  console.log(`   GET /registry - Consultar registro`);
  console.log(`   POST /createContract - Crear contrato`);
  console.log(`   GET /ipfs/:cid - Ver contenido IPFS (público)`);
  console.log(`   POST /ipfs/:cid - Pinear en Pinata`);
  
  console.log(`\n🔍 Debug de configuración:`);
  console.log(`   PINATA_ENABLED: ${process.env.PINATA_ENABLED}`);
  console.log(`   PINATA_JWT existe: ${!!process.env.PINATA_JWT}`);
  console.log(`   IPFS_ENDPOINT: ${process.env.IPFS_ENDPOINT}`);
  
  // Inicializar IPFS service al arrancar
  try {
    await ipfsService.initialize();
    console.log(`✅ IPFS inicializado correctamente`);
  } catch (error) {
    console.error('❌ Error al inicializar IPFS:', error);
  }
};

// Intentar iniciar servidor con HTTPS
const startServer = () => {
  const sslKeyPath = process.env.SSL_KEY_PATH || '/var/cpanel/ssl/installed/keys/rastrar.com.key';
  const sslCertPath = process.env.SSL_CERT_PATH || '/var/cpanel/ssl/installed/certs/rastrar.com.crt';
  const sslCaPath = process.env.SSL_CA_PATH;

  // Verificar si existen los certificados SSL
  const hasSSL = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

  if (hasSSL) {
    try {
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };

      // Agregar CA bundle si existe
      if (sslCaPath && fs.existsSync(sslCaPath)) {
        sslOptions.ca = fs.readFileSync(sslCaPath);
      }

      https.createServer(sslOptions, app).listen(PORT, async () => {
        console.log(`\n🔒 Servidor HTTPS ejecutándose en puerto ${PORT}`);
        console.log(`🌐 URL: https://rastrar.com:${PORT}`);
        await showServerInfo();
      });

      console.log(`✅ Certificados SSL cargados correctamente`);
      
    } catch (error) {
      console.error('❌ Error al cargar certificados SSL:', error.message);
      console.log('⚠️  Iniciando servidor en modo HTTP...');
      startHTTPServer();
    }
  } else {
    console.warn('\n⚠️  No se encontraron certificados SSL');
    console.warn(`   Buscado en: ${sslKeyPath}`);
    console.warn(`   Buscado en: ${sslCertPath}`);
    console.warn('   Iniciando servidor en modo HTTP...');
    console.warn('   Para habilitar HTTPS, configura SSL_KEY_PATH y SSL_CERT_PATH en .env\n');
    startHTTPServer();
  }
};

// Función para iniciar servidor HTTP
const startHTTPServer = () => {
  http.createServer(app).listen(PORT, async () => {
    console.log(`\n🚀 Servidor HTTP ejecutándose en puerto ${PORT}`);
    console.log(`🌐 URL: http://rastrar.com:${PORT}`);
    console.log(`⚠️  ADVERTENCIA: Conexión no segura (HTTP)`);
    await showServerInfo();
  });
};

// Iniciar el servidor
startServer();
