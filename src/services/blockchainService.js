import { ethers } from 'ethers';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
  }

  initialize() {
    if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error('Configuración de blockchain incompleta');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
  }

  setContract(address, abi) {
    if (!this.wallet) {
      this.initialize();
    }

    this.contract = new ethers.Contract(address, abi, this.wallet);
    return this.contract;
  }

  async registry(cid, validTo) {
    if (!this.contract) {
      throw new Error('Contrato no inicializado');
    }

    try {
      const tx = await this.contract.registry(cid, validTo);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        timestamp: Date.now(),
        signer: this.wallet.address
      };

    } catch (error) {
      console.error('Error en registry:', error);
      throw new Error(`Error blockchain: ${error.message}`);
    }
  }

  async changeStatus(cid, status) {
    if (!this.contract) {
      throw new Error('Contrato no inicializado');
    }

    try {
      const tx = await this.contract.changeStatus(cid, status);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        timestamp: Date.now(),
        signer: this.wallet.address
      };

    } catch (error) {
      console.error('Error en changeStatus:', error);
      throw new Error(`Error blockchain: ${error.message}`);
    }
  }

  async getRegistry(cid) {
    if (!this.contract) {
      throw new Error('Contrato no inicializado');
    }

    try {
      const result = await this.contract.getRegistry(cid);
      
      return {
        cid: result[0],
        status: result[1],
        validTo: result[2].toString(),
        timestamp: result[3].toString(),
        exists: result[4]
      };

    } catch (error) {
      console.error('Error en getRegistry:', error);
      throw new Error(`Error blockchain: ${error.message}`);
    }
  }

  async deployContract(abi, bytecode) {
    if (!this.wallet) {
      this.initialize();
    }

    try {
      const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
      const contract = await factory.deploy();
      await contract.waitForDeployment();

      const address = await contract.getAddress();

      return {
        address,
        transactionHash: contract.deploymentTransaction().hash,
        deployer: this.wallet.address
      };

    } catch (error) {
      console.error('Error al desplegar contrato:', error);
      throw new Error(`Error al desplegar: ${error.message}`);
    }
  }

  getExplorerUrl(txHash) {
    if (!process.env.EXPLORER_URL) {
      return null;
    }
    return `${process.env.EXPLORER_URL}/tx/${txHash}`;
  }
}

export default new BlockchainService();
