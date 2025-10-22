import express from 'express';
import Ajv from 'ajv';
import crypto from 'crypto';
import ipfsService from '../services/ipfsService.js';
import blockchainService from '../services/blockchainService.js';
import dbService from '../services/dbService.js';
import { CONTRACT_ABI } from '../contracts/abi.js';

const router = express.Router();
const ajv = new Ajv();

// Schema básico EPCIS (simplificado)
const epcisSchema = {
  type: 'object',
  properties: {
    '@context': { type: 'string' },
    type: { type: 'string' },
    eventTime: { type: 'string' },
    eventTimeZoneOffset: { type: 'string' },
    epcList: { type: 'array' },
    action: { type: 'string' },
    bizStep: { type: 'string' },
    disposition: { type: 'string' }
  },
  required: ['type', 'eventTime']
};

const validateEPCIS = ajv.compile(epcisSchema);

router.post('/', async (req, res) => {
  try {
    const { transaction, validTo } = req.body;

    // Validar campos requeridos
    if (!transaction) {
      return res.status(400).json({
        success: false,
        error: 'Campo transaction es requerido'
      });
    }

    // Validar formato JSON
    let jsonData;
    try {
      jsonData = typeof transaction === 'string' ? JSON.parse(transaction) : transaction;
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'El transaction no es un JSON válido'
      });
    }

    // Validar formato EPCIS
    const isValid = validateEPCIS(jsonData);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'El JSON no cumple con el formato EPCIS',
        details: validateEPCIS.errors
      });
    }

    // Calcular hash del JSON
    const jsonHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(jsonData))
      .digest('hex');

    // 1. Subir a IPFS
    const ipfsResult = await ipfsService.addJSON(jsonData);
    const cid = ipfsResult.cid;

    // 2. Registrar en blockchain
    if (!process.env.CONTRACT_ADDRESS) {
      return res.status(503).json({
        success: false,
        error: 'Contrato no desplegado. Use POST /createContract primero.'
      });
    }

    if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'ABI del contrato no disponible. Use POST /createContract primero.'
      });
    }

    blockchainService.setContract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI);
    
    const validToTimestamp = validTo ? Math.floor(new Date(validTo).getTime() / 1000) : 0;
    const blockchainResult = await blockchainService.registry(cid, validToTimestamp);

    // 3. Guardar en base de datos local
    await dbService.saveRecord(cid, {
      jsonHash,
      ipfs: {
        cid,
        size: ipfsResult.size,
        gatewayUrl: ipfsService.getGatewayURL(cid),
        localPath: ipfsResult.path
      },
      blockchain: {
        ...blockchainResult,
        explorerUrl: blockchainService.getExplorerUrl(blockchainResult.transactionHash)
      },
      validTo: validToTimestamp,
      status: 'active',
      data: jsonData
    });

    res.json({
      success: true,
      message: 'Evento registrado exitosamente',
      data: {
        cid,
        jsonHash,
        ipfs: {
          cid,
          gatewayUrl: ipfsService.getGatewayURL(cid)
        },
        blockchain: {
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          signer: blockchainResult.signer,
          explorerUrl: blockchainService.getExplorerUrl(blockchainResult.transactionHash)
        }
      }
    });

  } catch (error) {
    console.error('Error en /event:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar evento',
      details: error.message
    });
  }
});

export default router;
