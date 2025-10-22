import axios from 'axios';
import FormData from 'form-data';

class PinataService {
  constructor() {
    this.apiKey = null;
    this.secretKey = null;
    this.jwt = null;
    this.enabled = false;
  }

  initialize() {
    this.enabled = process.env.PINATA_ENABLED === 'true';
    
    if (!this.enabled) {
      return false;
    }

    this.jwt = process.env.PINATA_JWT;
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretKey = process.env.PINATA_SECRET_KEY;

    if (!this.jwt && (!this.apiKey || !this.secretKey)) {
      console.warn('⚠️ Pinata habilitado pero sin credenciales válidas');
      this.enabled = false;
      return false;
    }

    console.log('📌 Pinata habilitado y configurado');
    return true;
  }

  isEnabled() {
    if (!this.enabled) {
      this.initialize();
    }
    return this.enabled;
  }

  getHeaders(customJwt = null) {
    const jwt = customJwt || this.jwt;
    
    if (jwt) {
      return {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };
    } else {
      return {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.secretKey,
        'Content-Type': 'application/json'
      };
    }
  }

  async pinJSON(jsonData, metadata = {}, customCredentials = null) {
    try {
      const headers = customCredentials 
        ? this.getHeaders(customCredentials.jwt)
        : this.getHeaders();

      const data = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: metadata.name || 'EPCIS Document',
          keyvalues: metadata.keyvalues || {}
        },
        pinataOptions: {
          cidVersion: 0
        }
      };

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        data,
        { headers }
      );

      return {
        success: true,
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };

    } catch (error) {
      console.error('Error al pinear en Pinata:', error.response?.data || error.message);
      throw new Error(`Pinata error: ${error.response?.data?.error || error.message}`);
    }
  }

  async pinFile(filePath, metadata = {}) {
    try {
      const FormData = (await import('form-data')).default;
      const fs = await import('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      const pinataMetadata = JSON.stringify({
        name: metadata.name || 'EPCIS Document',
        keyvalues: metadata.keyvalues || {}
      });
      formData.append('pinataMetadata', pinataMetadata);

      const pinataOptions = JSON.stringify({
        cidVersion: 0
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          }
        }
      );

      return {
        success: true,
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };

    } catch (error) {
      console.error('Error al pinear archivo en Pinata:', error.response?.data || error.message);
      throw new Error(`Pinata error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getPinList(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?${params.toString()}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        count: response.data.count,
        rows: response.data.rows
      };

    } catch (error) {
      console.error('Error al obtener lista de pins:', error.response?.data || error.message);
      throw new Error(`Pinata error: ${error.response?.data?.error || error.message}`);
    }
  }

  async unpin(cid) {
    try {
      await axios.delete(
        `https://api.pinata.cloud/pinning/unpin/${cid}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        message: `CID ${cid} unpinned successfully`
      };

    } catch (error) {
      console.error('Error al unpin:', error.response?.data || error.message);
      throw new Error(`Pinata error: ${error.response?.data?.error || error.message}`);
    }
  }

  async testAuthentication(customCredentials = null) {
    try {
      const headers = customCredentials 
        ? this.getHeaders(customCredentials.jwt)
        : this.getHeaders();

      await axios.get(
        'https://api.pinata.cloud/data/testAuthentication',
        { headers }
      );

      return {
        success: true,
        message: 'Autenticación exitosa con Pinata'
      };

    } catch (error) {
      console.error('Error de autenticación Pinata:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

export default new PinataService();
