import express from 'express';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import blockchainService from '../services/blockchainService.js';
import dotenv from 'dotenv';

const router = express.Router();

async function getSolidityCode(source) {
  // 1. Si viene el código en base64
  if (source.solidityCodeBase64) {
    try {
      const decoded = Buffer.from(source.solidityCodeBase64, 'base64').toString('utf8');
      return decoded;
    } catch (error) {
      throw new Error('Error al decodificar base64: ' + error.message);
    }
  }

  // 2. Si viene el código directo
  if (source.solidityCode) {
    return source.solidityCode;
  }

  // 3. Si viene una URL
  if (source.contractUrl) {
    try {
      console.log('📥 Descargando contrato desde:', source.contractUrl);
      const response = await axios.get(source.contractUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Blockchain-IPFS-Registry/1.0'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error('Error al descargar contrato desde URL: ' + error.message);
    }
  }

  // 4. Usar contrato por defecto
  const defaultPath = path.join(process.cwd(), 'contracts', 'default.sol');
  if (fs.existsSync(defaultPath)) {
    console.log('📄 Usando contrato por defecto');
    return fs.readFileSync(defaultPath, 'utf8');
  }

  throw new Error('No se proporcionó código Solidity y no existe contrato por defecto');
}

router.post('/', async (req, res) => {
  try {
    let solidityCode;

    // Obtener el código Solidity de diferentes fuentes
    try {
      solidityCode = await getSolidityCode(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // 1. Preparar input para el compilador
    const input = {
      language: 'Solidity',
      sources: {
        'CertificateRegistry.sol': {
          content: solidityCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    // 2. Compilar el contrato
    console.log('🔨 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Verificar errores de compilación
    if (output.errors) {
      const errors = output.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Error de compilación',
          details: errors
        });
      }
    }

    // Obtener el primer contrato compilado
    const contractFile = Object.keys(output.contracts)[0];
    const contractName = Object.keys(output.contracts[contractFile])[0];
    const contract = output.contracts[contractFile][contractName];

    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log(`✅ Contrato ${contractName} compilado exitosamente`);

    // 3. Desplegar el contrato
    console.log('🚀 Desplegando contrato en blockchain...');
    const deployResult = await blockchainService.deployContract(abi, bytecode);

    // 4. Guardar la dirección del contrato en .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Reemplazar o agregar CONTRACT_ADDRESS
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${deployResult.address}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${deployResult.address}\n`;
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Recargar variables de entorno
    dotenv.config();

    // 5. Guardar ABI en archivo
    const abiPath = path.join(process.cwd(), 'src', 'contracts', 'abi.js');
    const abiDir = path.dirname(abiPath);
    
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    const abiContent = `// ABI generado automáticamente - ${new Date().toISOString()}\n// Contrato: ${contractName}\n// Dirección: ${deployResult.address}\n\nexport const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)};\n`;
    fs.writeFileSync(abiPath, abiContent, 'utf8');

    // 6. Guardar también el código fuente del contrato desplegado
    const deployedContractPath = path.join(process.cwd(), 'contracts', 'deployed.sol');
    fs.writeFileSync(deployedContractPath, solidityCode, 'utf8');

    console.log('✅ Contrato desplegado y configurado exitosamente');

    res.json({
      success: true,
      message: 'Contrato compilado y desplegado exitosamente',
      data: {
        contractName,
        address: deployResult.address,
        transactionHash: deployResult.transactionHash,
        deployer: deployResult.deployer,
        explorerUrl: blockchainService.getExplorerUrl(deployResult.transactionHash),
        abi,
        network: {
          rpcUrl: process.env.RPC_URL,
          chainId: process.env.CHAIN_ID
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en /createContract:', error);
    res.status(500).json({
      success: false,
      error: 'Error al compilar/desplegar contrato',
      details: error.message
    });
  }
});

export default router;
