import { Level } from 'level';
import path from 'path';

class DatabaseService {
  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'db');
    this.db = new Level(dbPath, { valueEncoding: 'json' });
  }

  async saveRecord(cid, data) {
    try {
      await this.db.put(cid, {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error al guardar en DB:', error);
      throw error;
    }
  }

  async getRecord(cid) {
    try {
      const record = await this.db.get(cid);
      return record;
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      console.error('Error al leer de DB:', error);
      throw error;
    }
  }

  async updateRecord(cid, data) {
    try {
      const existing = await this.getRecord(cid);
      
      if (!existing) {
        throw new Error('Registro no encontrado');
      }

      await this.db.put(cid, {
        ...existing,
        ...data,
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error al actualizar en DB:', error);
      throw error;
    }
  }

  async getAllRecords() {
    const records = [];
    
    try {
      for await (const [key, value] of this.db.iterator()) {
        records.push({ cid: key, ...value });
      }
      return records;
    } catch (error) {
      console.error('Error al listar registros:', error);
      throw error;
    }
  }

  async deleteRecord(cid) {
    try {
      await this.db.del(cid);
      return true;
    } catch (error) {
      console.error('Error al eliminar de DB:', error);
      throw error;
    }
  }

  async close() {
    await this.db.close();
  }
}

export default new DatabaseService();
