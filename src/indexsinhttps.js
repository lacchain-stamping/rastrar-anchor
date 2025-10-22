import https from 'https'; 
import express from 'express'; 
import cors from 'cors'; 
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit'; 
import dotenv from 'dotenv'; 
import setupRoutes from './routes/setup.js'; 
import eventRoutes from './routes/event.js'; 
import registryRoutes from './routes/registry.js'; 
import changeStatusRoutes from './routes/changeStatus.js'; 
import contractRoutes from './routes/contract.js'; 
import ipfsRoutes from './routes/ipfs.js'; 
import ipfsService from './services/ipfsService.js'; 
import { authMiddleware } from './middleware/auth.js'; 
import fs from 'fs'; dotenv.config();
import path from 'path';

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

app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📝 Endpoints disponibles:`);
  console.log(`   POST /setup - Configuración inicial`);
  console.log(`   POST /event - Registrar evento`);
  console.log(`   POST /changestatus - Cambiar estado`);
  console.log(`   GET /registry - Consultar registro`);
  console.log(`   POST /createContract - Crear contrato`);
  console.log(`   GET /ipfs/:cid - Ver contenido IPFS (público)`);
  console.log(`   POST /ipfs/:cid - Pinear en Pinata`);
  
  // Debug de variables de entorno
  console.log(`\n🔍 Debug de configuración:`);
  console.log(`   PINATA_ENABLED: ${process.env.PINATA_ENABLED}`);
  console.log(`   PINATA_JWT existe: ${!!process.env.PINATA_JWT}`);
  console.log(`   IPFS_ENDPOINT: ${process.env.IPFS_ENDPOINT}`);
  
  // Inicializar IPFS service al arrancar
  try {
    await ipfsService.initialize();
  } catch (error) {
    console.error('❌ Error al inicializar IPFS:', error);
  }
});
