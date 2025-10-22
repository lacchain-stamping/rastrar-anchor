import express from 'express';
import ipfsService from '../services/ipfsService.js';
import blockchainService from '../services/blockchainService.js';
import dbService from '../services/dbService.js';
import { CONTRACT_ABI } from '../contracts/abi.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { cid, address } = req.query;

    // Validar parámetros
    if (!cid) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro cid es requerido'
      });
    }

    // Verificar configuración del contrato
    if (!process.env.CONTRACT_ADDRESS) {
      return res.status(503).json({
        success: false,
        error: 'Contrato no desplegado'
      });
    }

    // 1. Obtener datos del IPFS
    let ipfsData;
    try {
      ipfsData = await ipfsService.getJSON(cid);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'CID no encontrado en IPFS ni localmente',
        details: error.message
      });
    }

    // 2. Obtener datos del smart contract
    blockchainService.setContract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI);
    let contractData;
    
    try {
      contractData = await blockchainService.getRegistry(cid);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Error al consultar el smart contract',
        details: error.message
      });
    }

    // Determinar estado actual
    let currentStatus = contractData.exists ? contractData.status : 'notfound';
    
    // Verificar si está vencido
    if (contractData.exists && contractData.validTo > 0) {
      const validToDate = new Date(parseInt(contractData.validTo) * 1000);
      const now = new Date();
      
      if (now > validToDate) {
        currentStatus = 'vencido';
      }
    }

    // 3. Obtener datos de la base de datos local
    const dbData = await dbService.getRecord(cid);

    res.json({
      success: true,
      data: {
        cid,
        status: currentStatus,
        ipfsData,
        contract: {
          status: contractData.status,
          validTo: contractData.validTo,
          timestamp: contractData.timestamp,
          exists: contractData.exists,
          validToDate: contractData.validTo > 0 
            ? new Date(parseInt(contractData.validTo) * 1000).toISOString() 
            : null
        },
        blockchain: dbData?.blockchain || null,
        gatewayUrl: ipfsService.getGatewayURL(cid),
        queryAddress: address || null
      }
    });

  } catch (error) {
    console.error('Error en /registry:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar registro',
      details: error.message
    });
  }
});

export default router;
