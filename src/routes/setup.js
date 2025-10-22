import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {
      rpcUrl,
      chainId,
      explorerUrl,
      privateKey,
      xTokenApi,
      ipfsEndpoint,
      ipfsGateway,
      pinataEnabled,
      pinataApiKey,
      pinataSecretKey,
      pinataJwt
    } = req.body;

    // Validar campos requeridos (ipfsEndpoint puede ser vacío para usar Helia local)
    if (!rpcUrl || !chainId || !privateKey || !xTokenApi || ipfsGateway === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        required: ['rpcUrl', 'chainId', 'privateKey', 'xTokenApi', 'ipfsGateway']
      });
    }
    
    // Si ipfsEndpoint está vacío, usar "local" como indicador
    const finalIpfsEndpoint = ipfsEndpoint || 'local';

    // Validar credenciales de Pinata si está habilitado
    if (pinataEnabled === true || pinataEnabled === 'true') {
      console.log('🔍 Pinata habilitado detectado:', pinataEnabled);
      if (!pinataJwt && (!pinataApiKey || !pinataSecretKey)) {
        return res.status(400).json({
          success: false,
          error: 'Si Pinata está habilitado, debe proporcionar pinataJwt o (pinataApiKey + pinataSecretKey)'
        });
      }
      console.log('✅ Credenciales de Pinata recibidas');
    }

    // Construir contenido del archivo .env
    const envContent = `# Configuración de la API
PORT=${process.env.PORT || 3000}
X_TOKEN_API=${xTokenApi}

# Configuración de Blockchain
RPC_URL=${rpcUrl}
CHAIN_ID=${chainId}
EXPLORER_URL=${explorerUrl || ''}
PRIVATE_KEY=${privateKey}
CONTRACT_ADDRESS=${process.env.CONTRACT_ADDRESS || ''}

# Configuración de IPFS
IPFS_ENDPOINT=${finalIpfsEndpoint}
IPFS_GATEWAY=${ipfsGateway}

# Configuración de Pinata (opcional)
PINATA_ENABLED=${pinataEnabled === true || pinataEnabled === 'true' ? 'true' : 'false'}
PINATA_API_KEY=${pinataApiKey || ''}
PINATA_SECRET_KEY=${pinataSecretKey || ''}
PINATA_JWT=${pinataJwt || ''}
`;

    // Escribir archivo .env
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');

    // Recargar variables de entorno
    dotenv.config();

    // Crear directorios necesarios si no existen
    const dirs = ['data', 'data/ipfs', 'data/db'];
    dirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    res.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: {
        rpcUrl,
        chainId,
        explorerUrl,
        ipfsEndpoint: finalIpfsEndpoint,
        ipfsGateway,
        pinataEnabled: pinataEnabled || false
      }
    });

  } catch (error) {
    console.error('Error en setup:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar configuración',
      details: error.message
    });
  }
});

export default router;
