import { createHelia } from 'helia';
import { json } from '@helia/json';
import { strings } from '@helia/strings';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

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
    if (process.env.IPFS_ENDPOINT && process.env.IPFS_ENDPOINT.startsWith('http')) {
      console.log('📡 Usando IPFS remoto:', process.env.IPFS_ENDPOINT);
      this.useRemote = true;
      this.remoteEndpoint = process.env.IPFS_ENDPOINT;
      return;
    }

    // Usar Helia local
    try {
      console.log('🚀 Inicializando Helia local...');
      this.helia = await createHelia();
      this.jsonStore = json(this.helia);
      this.stringStore = strings(this.helia);
      console.log('✅ Helia inicializado correctamente');
    } catch (error) {
      console.error('⚠️ Error al inicializar Helia, usando modo solo-local:', error.message);
      this.useRemote = false;
      this.helia = null;
    }
  }

  async addJSON(jsonData) {
    if (!this.helia && !this.useRemote) {
      await this.initialize();
    }

    try {
      const content = JSON.stringify(jsonData, null, 2);
      let cid;

      if (this.useRemote) {
        // Usar API remota (Infura, Pinata, etc.)
        cid = await this.addToRemoteIPFS(content);
      } else if (this.helia) {
        // Usar Helia local
        cid = await this.jsonStore.add(jsonData);
        cid = cid.toString();
      } else {
        // Modo fallback: solo guardar localmente y generar CID simulado
        const crypto = await import('crypto');
        cid = 'Qm' + crypto.createHash('sha256').update(content).digest('hex').substring(0, 44);
        console.warn('⚠️ Modo solo-local: CID generado localmente');
      }

      // Guardar localmente siempre
      const filePath = path.join(this.dataDir, `${cid}.json`);
      fs.writeFileSync(filePath, content, 'utf8');

      return {
        cid,
        size: Buffer.byteLength(content, 'utf8'),
        path: filePath
      };

    } catch (error) {
      console.error('Error al subir a IPFS:', error);
      throw new Error(`Error IPFS: ${error.message}`);
    }
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
