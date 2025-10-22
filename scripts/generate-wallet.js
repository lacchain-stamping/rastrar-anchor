#!/usr/bin/env node

/**
 * Generador de Wallet para Blockchain
 * Crea una nueva wallet con clave privada y dirección pública
 */

const { Wallet } = require('ethers');
const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║                                           ║');
console.log('║      GENERADOR DE WALLET BLOCKCHAIN       ║');
console.log('║                                           ║');
console.log('╚═══════════════════════════════════════════╝\n');

// Generar wallet aleatoria
const wallet = Wallet.createRandom();

console.log('✓ Wallet generada exitosamente\n');
console.log('═══════════════════════════════════════════\n');

// Información de la wallet
console.log('📍 DIRECCIÓN PÚBLICA (Address):');
console.log(`   ${wallet.address}\n`);

console.log('🔑 CLAVE PRIVADA (Private Key):');
console.log(`   ${wallet.privateKey}\n`);

console.log('🔐 MNEMONIC (Frase de Recuperación):');
console.log(`   ${wallet.mnemonic.phrase}\n`);

console.log('═══════════════════════════════════════════\n');

// Advertencias de seguridad
console.log('⚠️  IMPORTANTE - SEGURIDAD:\n');
console.log('1. NUNCA compartas tu clave privada con nadie');
console.log('2. Guarda el mnemonic en un lugar seguro');
console.log('3. NO subas la clave privada a GitHub o repositorios públicos');
console.log('4. Usa esta wallet solo para desarrollo/pruebas\n');

console.log('═══════════════════════════════════════════\n');

// Preguntar si desea guardar en .env
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('¿Deseas agregar esta clave al archivo .env? (s/n): ', (answer) => {
  if (answer.toLowerCase() === 's') {
    const envPath = path.join(__dirname, '..', '.env');
    
    // Leer .env existente o crear uno nuevo
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Verificar si ya existe PRIVATE_KEY
    if (envContent.includes('PRIVATE_KEY=')) {
      console.log('\n⚠️  El archivo .env ya contiene una PRIVATE_KEY');
      readline.question('¿Deseas reemplazarla? (s/n): ', (replace) => {
        if (replace.toLowerCase() === 's') {
          envContent = envContent.replace(/PRIVATE_KEY=.*/, `PRIVATE_KEY=${wallet.privateKey}`);
          fs.writeFileSync(envPath, envContent);
          console.log('\n✓ Clave privada actualizada en .env');
        } else {
          console.log('\n✓ No se realizaron cambios');
        }
        readline.close();
      });
    } else {
      // Agregar PRIVATE_KEY
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `\n# Wallet generada el ${new Date().toISOString()}\n`;
      envContent += `PRIVATE_KEY=${wallet.privateKey}\n`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('\n✓ Clave privada agregada a .env');
      readline.close();
    }
  } else {
    console.log('\n✓ Recuerda copiar y guardar tu clave privada manualmente');
    readline.close();
  }
});

readline.on('close', () => {
  console.log('\n═══════════════════════════════════════════\n');
  console.log('📝 PRÓXIMOS PASOS:\n');
  console.log('1. Copia tu dirección (address) para recibir fondos');
  console.log('2. Obtén fondos de prueba del faucet:');
  console.log('   - Celo Alfajores: https://faucet.celo.org/alfajores');
  console.log('   - Polygon Mumbai: https://faucet.polygon.technology');
  console.log('   - Ethereum Sepolia: https://sepoliafaucet.com\n');
  console.log('3. Configura tu .env con la clave privada');
  console.log('4. ¡Listo para usar!\n');
  
  process.exit(0);
});