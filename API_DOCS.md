# Guía Completa - Sistema de Registro Blockchain con IPFS y Pinata

Sistema completo para registrar eventos EPCIS en blockchain con almacenamiento en IPFS (local o Pinata).

---

## 📋 Tabla de Contenidos

1. [Instalación](#instalación)
2. [Configuración Inicial](#configuración-inicial)
3. [Configuración con Pinata (Opcional)](#configuración-con-pinata)
4. [Desplegar Contrato](#desplegar-contrato)
5. [Registrar Eventos](#registrar-eventos)
6. [Consultar Certificados](#consultar-certificados)
7. [Cambiar Estados](#cambiar-estados)
8. [Endpoints IPFS](#endpoints-ipfs)
9. [Ejemplo Completo: Celo Alfajores](#ejemplo-completo-celo-alfajores)

---

## 🚀 Instalación

### Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Acceso a nodo RPC blockchain
- (Opcional) Cuenta Pinata para IPFS público

### 1. Crear estructura del proyecto

```bash
mkdir blockchain-ipfs-registry
cd blockchain-ipfs-registry
mkdir -p src/{routes,services,middleware,contracts} data/{ipfs,db} contracts
```

### 2. Instalar dependencias

```bash
npm install
```

**Dependencias instaladas:**
- express, cors, helmet - API y seguridad
- ethers, solc - Blockchain
- helia, @helia/json, @helia/strings - IPFS
- level - Base de datos local
- ajv - Validación JSON
- axios, form-data - HTTP y archivos
- nodemon - Desarrollo

### 3. Configurar nodemon

Crear `nodemon.json`:

```json
{
  "watch": ["src"],
  "ignore": ["data/*", "node_modules/*", "*.log"],
  "ext": "js,json"
}
```

### 4. Crear archivo de contrato por defecto

Copiar el contrato a `contracts/default.sol` (proporcionado en los artifacts).

### 5. Iniciar servidor

```bash
npm run dev
```

Deberías ver:
```
💾 Modo IPFS solo-local activado (sin Helia)
🚀 Servidor ejecutándose en puerto 3000
📝 Endpoints disponibles:
   POST /setup - Configuración inicial
   POST /event - Registrar evento
   POST /changestatus - Cambiar estado
   GET /registry - Consultar registro
   POST /createContract - Crear contrato
   GET /ipfs/:cid - Ver contenido IPFS (público)
   POST /ipfs/:cid - Pinear en Pinata
```

---

## ⚙️ Configuración Inicial

### Setup SIN Pinata (Solo Local)

```bash
curl -X POST http://localhost:3000/setup \
  -H "Content-Type: application/json" \
  -d '{
    "rpcUrl": "https://alfajores-forno.celo-testnet.org",
    "chainId": "44787",
    "explorerUrl": "https://alfajores.celoscan.io",
    "privateKey": "0xTU_PRIVATE_KEY",
    "xTokenApi": "tu-token-secreto-123",
    "ipfsEndpoint": "local",
    "ipfsGateway": "https://ipfs.io"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración guardada exitosamente",
  "config": {
    "rpcUrl": "https://alfajores-forno.celo-testnet.org",
    "chainId": "44787",
    "explorerUrl": "https://alfajores.celoscan.io",
    "ipfsEndpoint": "local",
    "ipfsGateway": "https://ipfs.io",
    "pinataEnabled": false
  }
}
```

**⚠️ Después de setup, SIEMPRE reinicia el servidor:**
```bash
# Ctrl+C
npm run dev
```

---

## 📌 Configuración con Pinata

### 1. Obtener credenciales de Pinata

1. Ve a https://app.pinata.cloud
2. Crea una cuenta
3. Ve a **API Keys**
4. Crea una nueva key con permisos:
   - ✅ **Files: Write** (para subir)
   - ✅ **Gateways: Read** (para leer)
5. Copia el **JWT Token** (empieza con `eyJ...`)

### 2. Setup CON Pinata

```bash
curl -X POST http://localhost:3000/setup \
  -H "Content-Type: application/json" \
  -d '{
    "rpcUrl": "https://alfajores-forno.celo-testnet.org",
    "chainId": "44787",
    "explorerUrl": "https://alfajores.celoscan.io",
    "privateKey": "0xTU_PRIVATE_KEY",
    "xTokenApi": "tu-token-secreto-123",
    "ipfsEndpoint": "local",
    "ipfsGateway": "https://gateway.pinata.cloud",
    "pinataEnabled": true,
    "pinataJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Con Pinata habilitado:**
- ✅ Archivos se guardan localmente
- ✅ **Automáticamente** se pinean en Pinata
- ✅ CID se verifica que coincida
- ✅ Disponible en `https://gateway.pinata.cloud/ipfs/[CID]`

**Reinicia el servidor después del setup.**

---

## 📝 Desplegar Contrato

### Opción 1: Contrato por defecto (recomendado)

```bash
curl -X POST http://localhost:3000/createContract \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{}'
```

### Opción 2: Código en base64

```bash
# Convertir a base64
base64 -w 0 contracts/default.sol > contract.b64

# Enviar
curl -X POST http://localhost:3000/createContract \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d "{\"solidityCodeBase64\": \"$(cat contract.b64)\"}"
```

### Opción 3: Desde URL

```bash
curl -X POST http://localhost:3000/createContract \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "contractUrl": "https://raw.githubusercontent.com/user/repo/contract.sol"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Contrato compilado y desplegado exitosamente",
  "data": {
    "contractName": "CertificateRegistry",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "transactionHash": "0x1a2b3c4d...",
    "explorerUrl": "https://alfajores.celoscan.io/tx/0x1a2b3c4d..."
  }
}
```

---

## 🐟 Registrar Eventos

### Evento Simple

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "transaction": {
      "type": "ObjectEvent",
      "eventTime": "2025-10-21T10:00:00Z",
      "action": "OBSERVE",
      "bizStep": "shipping",
      "epcList": ["urn:epc:id:sgtin:0614141.107346.2017"]
    },
    "validTo": "2026-10-21T10:00:00Z"
  }'
```

### Evento Completo: Compra de Alevinos (3 eventos atómicos)

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "transaction": {
      "type": "EPCISDocument",
      "eventTime": "2025-10-21T10:45:00-05:00",
      "eventTimeZoneOffset": "-05:00",
      "schemaVersion": "2.0",
      "creationDate": "2025-10-21T10:45:00-05:00",
      "eventList": [
        {
          "eventID": "evento-01-inspeccion",
          "type": "ObjectEvent",
          "eventTime": "2025-10-21T08:30:00-05:00",
          "epcList": ["urn:epc:id:sgtin:7501234.alevinos.lote2025001"],
          "action": "OBSERVE",
          "bizStep": "inspecting",
          "disposition": "in_progress",
          "quantityList": [{
            "epcClass": "urn:epc:class:lgtin:7501234.alevinos.tilapia",
            "quantity": 50000,
            "uom": "unidades"
          }],
          "ilmd": {
            "lote": "LOTE-2025-001",
            "proveedor": "Acuicultura del Norte SAC",
            "especie": "Oreochromis niloticus",
            "pesoTotal": "125kg",
            "inspector": "Juan Pérez"
          }
        },
        {
          "eventID": "evento-02-rechazo-parcial",
          "type": "ObjectEvent",
          "eventTime": "2025-10-21T09:15:00-05:00",
          "epcList": ["urn:epc:id:sgtin:7501234.alevinos.lote2025001-rechazado"],
          "action": "DELETE",
          "bizStep": "inspecting",
          "disposition": "non_conformant",
          "quantityList": [{
            "epcClass": "urn:epc:class:lgtin:7501234.alevinos.tilapia",
            "quantity": 3500,
            "uom": "unidades"
          }],
          "ilmd": {
            "motivoRechazo": "Alevinos con signos de estrés",
            "cantidadRechazada": 3500,
            "porcentajeRechazo": "7%",
            "accionTomada": "Devolución al proveedor"
          }
        },
        {
          "eventID": "evento-03-aceptacion-siembra",
          "type": "AggregationEvent",
          "eventTime": "2025-10-21T10:45:00-05:00",
          "parentID": "urn:epc:id:sgln:7501234.poza.A12",
          "childEPCs": ["urn:epc:id:sgtin:7501234.alevinos.lote2025001"],
          "action": "ADD",
          "bizStep": "stocking",
          "disposition": "active",
          "quantityList": [{
            "epcClass": "urn:epc:class:lgtin:7501234.alevinos.tilapia",
            "quantity": 46500,
            "uom": "unidades"
          }],
          "ilmd": {
            "cantidadAceptada": 46500,
            "porcentajeAceptacion": "93%",
            "pesoTotalAceptado": "116.25kg",
            "areaPoza": "3100m2",
            "temperaturaAgua": "26°C",
            "facturaAceptada": "FACT-2025-AN-00123",
            "responsableSiembra": "María González"
          }
        }
      ]
    },
    "validTo": "2027-10-21T23:59:59Z"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Evento registrado exitosamente",
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "jsonHash": "a1b2c3d4e5f6...",
    "ipfs": {
      "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      "gatewayUrl": "https://gateway.pinata.cloud/ipfs/Qm..."
    },
    "blockchain": {
      "transactionHash": "0x9f8e7d6c...",
      "blockNumber": 28471923,
      "signer": "0x8B74D0F86BC8C1AF176E8F8d5F3F9dC9F6d1E7c2",
      "explorerUrl": "https://alfajores.celoscan.io/tx/0x9f8e7d6c..."
    },
    "pinata": {
      "success": true,
      "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      "pinataUrl": "https://gateway.pinata.cloud/ipfs/Qm..."
    }
  }
}
```

**Si Pinata está habilitado, verás también:**
```json
"pinata": {
  "success": true,
  "cid": "QmYwAPJzv...",
  "timestamp": "2025-10-21T10:45:30.000Z",
  "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmYwAPJzv..."
}
```

---

## 🔍 Consultar Certificados

### GET /registry - Consultar certificado

```bash
curl "http://localhost:3000/registry?cid=QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG" \
  -H "X-Token-API: tu-token-secreto-123"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "status": "active",
    "ipfsData": {
      "type": "EPCISDocument",
      "eventList": [
        {
          "eventID": "evento-01-inspeccion",
          "ilmd": {
            "lote": "LOTE-2025-001",
            "proveedor": "Acuicultura del Norte SAC"
          }
        },
        {
          "eventID": "evento-02-rechazo-parcial",
          "ilmd": {
            "cantidadRechazada": 3500
          }
        },
        {
          "eventID": "evento-03-aceptacion-siembra",
          "ilmd": {
            "cantidadAceptada": 46500,
            "facturaAceptada": "FACT-2025-AN-00123"
          }
        }
      ]
    },
    "contract": {
      "status": "active",
      "validTo": "1824336000",
      "validToDate": "2027-10-21T23:59:59.000Z",
      "exists": true
    },
    "blockchain": {
      "transactionHash": "0x9f8e7d6c...",
      "blockNumber": 28471923,
      "signer": "0x8B74D0F86BC8C1AF176E8F8d5F3F9dC9F6d1E7c2"
    },
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmYwAPJzv..."
  }
}
```

---

## ⚙️ Cambiar Estados

### Desactivar certificado

```bash
curl -X POST http://localhost:3000/changestatus \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "status": "inactive"
  }'
```

### Rechazar certificado

```bash
curl -X POST http://localhost:3000/changestatus \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "status": "reject"
  }'
```

### Reactivar certificado

```bash
curl -X POST http://localhost:3000/changestatus \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "status": "active"
  }'
```

**Estados válidos:** `active`, `inactive`, `reject`

**Estados automáticos:**
- `vencido` - Cuando `validTo` < fecha actual
- `notfound` - CID no existe en blockchain

---

## 🌐 Endpoints IPFS

### GET /ipfs/:cid - Ver contenido (público, sin autenticación)

```bash
curl http://localhost:3000/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

**Respuesta:**
```json
{
  "success": true,
  "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "data": {
    "type": "EPCISDocument",
    "eventList": [...]
  },
  "source": "local",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmYwAPJzv..."
}
```

### POST /ipfs/:cid - Pinear en Pinata con credenciales específicas

Útil cuando quieres pinear un CID existente con credenciales diferentes o específicas.

```bash
curl -X POST http://localhost:3000/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG \
  -H "Content-Type: application/json" \
  -H "X-Token-API: tu-token-secreto-123" \
  -d '{
    "pinataJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "metadata": {
      "name": "Alevinos Lote 2025-001",
      "keyvalues": {
        "lote": "2025-001",
        "tipo": "alevinos",
        "empresa": "Acuicultura del Norte"
      }
    }
  }'
```

**Respuesta (CID coincide):**
```json
{
  "success": true,
  "message": "CID pineado exitosamente en Pinata",
  "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "pinata": {
    "success": true,
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmYwAPJzv..."
  },
  "verification": {
    "cidMatch": true,
    "message": "El CID local coincide con el CID de Pinata"
  }
}
```

**Respuesta (CID NO coincide):**
```json
{
  "success": true,
  "warning": "CID generado por Pinata difiere del CID local",
  "localCid": "QmYwAPJzv...",
  "pinataCid": "QmXXXXXXX...",
  "message": "Esto puede indicar diferencias en el formato del JSON"
}
```

---

## 🎯 Ejemplo Completo: Celo Alfajores

### 1. Obtener fondos de prueba

**Dirección:** `0x8B74D0F86BC8C1AF176E8F8d5F3F9dC9F6d1E7c2`

Faucet: https://faucet.celo.org/alfajores

### 2. Configurar para Celo con Pinata

```bash
curl -X POST http://localhost:3000/setup \
  -H "Content-Type: application/json" \
  -d '{
    "rpcUrl": "https://alfajores-forno.celo-testnet.org",
    "chainId": "44787",
    "explorerUrl": "https://alfajores.celoscan.io",
    "privateKey": "0x45c51017b85b23de71364e101a370d4f3a8f00dbcf01b641a86d7070583289ec",
    "xTokenApi": "celo-token-123",
    "ipfsEndpoint": "local",
    "ipfsGateway": "https://gateway.pinata.cloud",
    "pinataEnabled": true,
    "pinataJwt": "TU_JWT_PINATA"
  }'
```

**Reiniciar servidor.**

### 3. Desplegar contrato

```bash
curl -X POST http://localhost:3000/createContract \
  -H "Content-Type: application/json" \
  -H "X-Token-API: celo-token-123" \
  -d '{}'
```

### 4. Registrar evento

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -H "X-Token-API: celo-token-123" \
  -d '{
    "transaction": {
      "type": "ObjectEvent",
      "eventTime": "2025-10-21T10:00:00Z",
      "action": "OBSERVE",
      "bizStep": "shipping",
      "epcList": ["urn:epc:id:sgtin:7501234.test.001"]
    },
    "validTo": "2026-10-21T10:00:00Z"
  }'
```

### 5. Verificar en Pinata

1. Ve a https://app.pinata.cloud/pinmanager
2. Busca tu CID
3. Debería aparecer con el nombre `EPCIS-[CID]`

### 6. Ver en navegador

```
https://gateway.pinata.cloud/ipfs/[TU_CID]
```

---

## 📊 Comparación: Local vs Pinata

| Característica | Solo Local | Con Pinata |
|---------------|------------|------------|
| **Almacenamiento** | Solo en tu servidor | Servidor + Pinata |
| **Disponibilidad** | Solo cuando tu servidor está activo | 24/7 en Pinata |
| **URL pública** | No (solo local) | Sí, gateway Pinata |
| **Costo** | Gratis | Gratis (plan básico) |
| **Configuración** | Simple | Requiere API key |
| **Backup** | Manual | Automático |
| **CID válido** | ✅ Sí | ✅ Sí (mismo CID) |

---

## 🔧 Redes Blockchain Soportadas

### Celo Alfajores (Testnet)
```json
{
  "rpcUrl": "https://alfajores-forno.celo-testnet.org",
  "chainId": "44787",
  "explorerUrl": "https://alfajores.celoscan.io",
  "faucet": "https://faucet.celo.org/alfajores"
}
```

### Polygon Mumbai (Testnet)
```json
{
  "rpcUrl": "https://rpc-mumbai.maticvigil.com",
  "chainId": "80001",
  "explorerUrl": "https://mumbai.polygonscan.com",
  "faucet": "https://faucet.polygon.technology"
}
```

### Ethereum Sepolia (Testnet)
```json
{
  "rpcUrl": "https://sepolia.infura.io/v3/YOUR_KEY",
  "chainId": "11155111",
  "explorerUrl": "https://sepolia.etherscan.io",
  "faucet": "https://sepoliafaucet.com"
}
```

---

## ❓ Solución de Problemas

### Error: "Empty reply from server"
**Causa:** Nodemon reiniciando constantemente
**Solución:**
1. Verifica que existe `nodemon.json`
2. Reinicia el servidor completamente

### Error: "CID inválido - Non-base58btc character"
**Causa:** CID generado incorrectamente
**Solución:** Ya está corregido en la última versión del código

### Error: "Pinata error: Unauthorized"
**Causa:** JWT inválido o expirado
**Solución:**
1. Genera nuevo JWT en Pinata
2. Ejecuta `/setup` de nuevo
3. Reinicia servidor

### CID no aparece en ipfs.io
**Causa:** Archivo solo está local
**Solución:**
1. Habilita Pinata en `/setup`
2. O usa `POST /ipfs/:cid` para pinear manualmente

### Error: "insufficient funds"
**Causa:** Wallet sin fondos
**Solución:**
1. Obtén fondos del faucet de la red
2. Verifica balance en el explorer

---

## 🔐 Seguridad

**⚠️ IMPORTANTE:**

- ❌ NUNCA subas `.env` a repositorios
- ❌ NUNCA compartas tu private key
- ❌ NUNCA uses wallets de producción en testnet
- ✅ Usa diferentes `X_TOKEN_API` para cada ambiente
- ✅ Rota credenciales periódicamente
- ✅ Usa HTTPS en producción

---

## 📁 Estructura de Archivos

```
blockchain-ipfs-registry/
├── package.json
├── nodemon.json
├── .env (generado por /setup)
├── .env.example
├── src/
│   ├── index.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── setup.js
│   │   ├── event.js
│   │   ├── changeStatus.js
│   │   ├── registry.js
│   │   ├── contract.js
│   │   └── ipfs.js
│   ├── services/
│   │   ├── ipfsService.js
│   │   ├── blockchainService.js
│   │   ├── dbService.js
│   │   └── pinataService.js
│   └── contracts/
│       └── abi.js (generado)
├── contracts/
│   ├── default.sol
│   ├── CertificateRegistry.sol
│   └── deployed.sol (generado)
└── data/
    ├── ipfs/ (archivos JSON)
    └── db/ (LevelDB)
```

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo que:

✅ Registra eventos EPCIS en blockchain  
✅ Almacena en IPFS (local o Pinata)  
✅ Genera CIDs válidos compatibles con IPFS  
✅ Soporta pinning automático en Pinata  
✅ API REST completa con autenticación  
✅ Trazabilidad inmutable  

**¡Comienza a registrar tus eventos!** 🚀🐟
