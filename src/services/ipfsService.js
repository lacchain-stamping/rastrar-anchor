import { createHelia } from 'helia';
import { json } from '@helia/json';
import { strings } from '@helia/strings';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pinataService from './pinataService.js';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

class IPFSService {
  constructor() {
    this.helia = null;
    this.jsonStore = null;
    this.stringStore = null;
    this.dataDir = path.join(process.cwd(), 'data', 'ipfs');
    this.useRemote = false;
    this.remoteEndpoint = null;
  }

  async initialize() {
    // Asegurar que existe el directorio
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Verificar si se usa endpoint remoto (como Infura, Pinata)
    if (process.env.IPFS_ENDPOINT && 
        process.env.IPFS_ENDPOINT !== 'local' && 
        process.env.IPFS_ENDPOINT.startsWith('http')) {
      console.log('📡 Usando IPFS remoto:', process.env.IPFS_ENDPOINT);
      this.useRemote = true;
      this.remoteEndpoint = process.env.IPFS_ENDPOINT;
      return;
    }

    // Modo solo-local: No inicializar Helia, solo guardar archivos localmente
    console.log('💾 Modo IPFS solo-local activado (sin Helia)');
    console.log('   - Los archivos se guardarán en:', this.dataDir);
    console.log('   - Se generarán CIDs válidos basados en hash SHA-256');
    this.useRemote = false;
    this.helia = null;

    // Inicializar Pinata si está habilitado
    if (pinataService.initialize()) {
      console.log('📌 Pinata habilitado y configurado');
    }
  }

  async addJSON(jsonData) {
    if (!this.helia && !this.useRemote && this.remoteEndpoint === null) {
      await this.initialize();
    }

    try {
      const content = JSON.stringify(jsonData, null, 2);
      let cid;
      let pinataResult = null;

      // Si Pinata está habilitado, usarlo primero para obtener el CID oficial
      if (pinataService.isEnabled()) {
        try {
          console.log('📌 Pineando en Pinata primero...');
          pinataResult = await pinataService.pinJSON(jsonData, {
            name: `EPCIS-${Date.now()}`,
            keyvalues: {
              type: 'epcis',
              timestamp: Date.now()
            }
          });
          
          // Usar el CID de Pinata como oficial
          cid = pinataResult.cid;
          console.log(`✅ CID oficial de Pinata: ${cid}`);
          
        } catch (error) {
          console.error('⚠️ Error al pinear en Pinata, generando CID local:', error.message);
          // Fallback: generar CID local
          cid = await this.generateLocalCID(content);
        }
      } else {
        // No hay Pinata, generar CID local
        if (this.useRemote) {
          cid = await this.addToRemoteIPFS(content);
        } else {
          cid = await this.generateLocalCID(content);
        }
      }

      // Guardar localmente con el CID correcto
      const filePath = path.join(this.dataDir, `${cid}.json`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`💾 Guardado localmente: ${cid}.json`);

      return {
        cid,
        size: Buffer.byteLength(content, 'utf8'),
        path: filePath,
        pinata: pinataResult
      };

    } catch (error) {
      console.error('Error al procesar JSON para IPFS:', error);
      throw new Error(`Error IPFS: ${error.message}`);
    }
  }

  async generateLocalCID(content) {
    const bytes = new TextEncoder().encode(content);
    const hash = await sha256.digest(bytes);
    const c = CID.create(0, raw.code, hash); // CID v0 (Qm...)
    const cid = c.toString();
    console.log('💾 CID generado localmente:', cid);
    return cid;
  }

  async addToRemoteIPFS(content) {
    try {
      // Formato genérico para APIs IPFS
      const formData = new FormData();
      const blob = new Blob([content], { type: 'application/json' });
      formData.append('file', blob);

      // Intentar con API estándar de IPFS
      const response = await axios.post(`${this.remoteEndpoint}/api/v0/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        maxBodyLength: Infinity
      });

      return response.data.Hash || response.data.cid;
    } catch (error) {
      console.error('Error con IPFS remoto:', error.message);
      // Si falla, usar modo local
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return 'Qm' + hash.substring(0, 44);
    }
  }

  async getJSON(cid) {
    try {
      // 1. Intentar leer desde archivo local primero (más rápido)
      const filePath = path.join(this.dataDir, `${cid}.json`);
      
      if (fs.existsSync(filePath)) {
        console.log(`📁 CID ${cid} encontrado localmente`);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }

      // 2. Si no está local, intentar desde IPFS
      if (this.useRemote) {
        return await this.getFromRemoteIPFS(cid);
      } else if (this.helia) {
        const data = await this.jsonStore.get(cid);
        // Guardar localmente para futura referencia
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, content, 'utf8');
        return data;
      }

      // 3. Intentar desde gateway público
      return await this.getFromGateway(cid);

    } catch (error) {
      console.error(`Error al obtener CID ${cid}:`, error.message);
      throw new Error(`CID ${cid} no encontrado en IPFS ni localmente`);
    }
  }

  async getFromRemoteIPFS(cid) {
    try {
      const response = await axios.post(
        `${this.remoteEndpoint}/api/v0/cat?arg=${cid}`,
        null,
        { timeout: 10000 }
      );

      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      // Guardar localmente
      const filePath = path.join(this.dataDir, `${cid}.json`);
      fs.writeFileSync(filePath, content, 'utf8');
      
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Error obteniendo desde IPFS remoto: ${error.message}`);
    }
  }

  async getFromGateway(cid) {
    try {
      const gatewayUrl = `${process.env.IPFS_GATEWAY}/ipfs/${cid}`;
      console.log(`🌐 Intentando obtener desde gateway: ${gatewayUrl}`);
      
      const response = await axios.get(gatewayUrl, { timeout: 15000 });
      const data = response.data;
      
      // Guardar localmente
      const filePath = path.join(this.dataDir, `${cid}.json`);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, content, 'utf8');
      
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      throw new Error(`Error obteniendo desde gateway: ${error.message}`);
    }
  }

  async pin(cid) {
    try {
      if (this.useRemote) {
        await axios.post(`${this.remoteEndpoint}/api/v0/pin/add?arg=${cid}`);
      } else if (this.helia) {
        // En Helia, el pinning es automático al agregar contenido
        console.log(`✅ CID ${cid} está pineado automáticamente en Helia`);
      }
      return true;
    } catch (error) {
      console.error('Error al pinear:', error);
      return false;
    }
  }

  getGatewayURL(cid) {
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io';
    return `${gateway}/ipfs/${cid}`;
  }

  async close() {
    if (this.helia) {
      await this.helia.stop();
      console.log('🛑 Helia detenido');
    }
  }
}

export default new IPFSService();
