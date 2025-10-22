import express from 'express';
import blockchainService from '../services/blockchainService.js';
import dbService from '../services/dbService.js';
import { CONTRACT_ABI } from '../contracts/abi.js';

const router = express.Router();

const VALID_STATUSES = ['active', 'reject', 'inactive'];

router.post('/', async (req, res) => {
  try {
    const { cid, status } = req.body;

    // Validar campos requeridos
    if (!cid || !status) {
      return res.status(400).json({
        success: false,
        error: 'Campos cid y status son requeridos'
      });
    }

    // Validar estado
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido',
        validStatuses: VALID_STATUSES
      });
    }

    // Verificar que el CID existe en la base de datos
    const existingRecord = await dbService.getRecord(cid);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'CID no encontrado en la base de datos'
      });
    }

    // Verificar configuración del contrato
    if (!process.env.CONTRACT_ADDRESS) {
      return res.status(503).json({
        success: false,
        error: 'Contrato no desplegado'
      });
    }

    // Cambiar estado en blockchain
    blockchainService.setContract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI);
    const blockchainResult = await blockchainService.changeStatus(cid, status);

    // Actualizar en base de datos local
    await dbService.updateRecord(cid, {
      status,
      lastStatusChange: {
        status,
        timestamp: Date.now(),
        blockchain: {
          ...blockchainResult,
          explorerUrl: blockchainService.getExplorerUrl(blockchainResult.transactionHash)
        }
      }
    });

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: {
        cid,
        newStatus: status,
        blockchain: {
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          signer: blockchainResult.signer,
          explorerUrl: blockchainService.getExplorerUrl(blockchainResult.transactionHash)
        }
      }
    });

  } catch (error) {
    console.error('Error en /changestatus:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar estado',
      details: error.message
    });
  }
});

export default router;
