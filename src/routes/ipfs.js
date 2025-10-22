import express from 'express';
import ipfsService from '../services/ipfsService.js';
import pinataService from '../services/pinataService.js';

const router = express.Router();

// GET /ipfs/:cid - Obtener contenido (público, sin autenticación)
router.get('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid || !cid.startsWith('Qm')) {
      return res.status(400).json({
        success: false,
        error: 'CID inválido'
      });
    }

    // Intentar obtener el JSON
    const data = await ipfsService.getJSON(cid);

    res.json({
      success: true,
      cid,
      data,
      source: 'local',
      gatewayUrl: ipfsService.getGatewayURL(cid)
    });

  } catch (error) {
    console.error('Error en GET /ipfs/:cid:', error);
    res.status(404).json({
      success: false,
      error: 'CID no encontrado',
      details: error.message
    });
  }
});

// POST /ipfs/:cid - Pinear en Pinata con credenciales específicas (requiere autenticación)
router.post('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const { pinataJwt, pinataApiKey, pinataSecretKey, metadata } = req.body;

    // Validar CID
    if (!cid || !cid.startsWith('Qm')) {
      return res.status(400).json({
        success: false,
        error: 'CID inválido'
      });
    }

    // Validar credenciales de Pinata
    if (!pinataJwt && (!pinataApiKey || !pinataSecretKey)) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar credenciales de Pinata: pinataJwt o (pinataApiKey + pinataSecretKey)'
      });
    }

    // Obtener el JSON local
    const jsonData = await ipfsService.getJSON(cid);

    // Preparar credenciales personalizadas
    const customCredentials = pinataJwt 
      ? { jwt: pinataJwt }
      : { apiKey: pinataApiKey, secretKey: pinataSecretKey };

    // Pinear en Pinata con las credenciales proporcionadas
    console.log('📌 Pineando CID en Pinata con credenciales personalizadas...');
    const pinataResult = await pinataService.pinJSON(jsonData, {
      name: metadata?.name || `EPCIS-${cid}`,
      keyvalues: metadata?.keyvalues || {
        type: 'epcis',
        timestamp: Date.now(),
        manual_pin: true
      }
    }, customCredentials);

    // Verificar que el CID coincide
    if (pinataResult.cid !== cid) {
      console.warn(`⚠️ ADVERTENCIA: CID local (${cid}) difiere de Pinata (${pinataResult.cid})`);
      
      return res.json({
        success: true,
        warning: 'CID generado por Pinata difiere del CID local',
        localCid: cid,
        pinataCid: pinataResult.cid,
        message: 'Esto puede indicar diferencias en el formato del JSON',
        pinata: pinataResult
      });
    }

    res.json({
      success: true,
      message: 'CID pineado exitosamente en Pinata',
      cid,
      pinata: pinataResult,
      verification: {
        cidMatch: true,
        message: 'El CID local coincide con el CID de Pinata'
      }
    });

  } catch (error) {
    console.error('Error en POST /ipfs/:cid:', error);
    res.status(500).json({
      success: false,
      error: 'Error al pinear en Pinata',
      details: error.message
    });
  }
});

export default router;
