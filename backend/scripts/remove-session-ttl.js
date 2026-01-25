/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * REMOVER TTL DE SESIONES EXISTENTES
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Script para hacer que las sesiones existentes sean indefinidas
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const RedisService = require('../services/redis.service');

async function removeTTL() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ♾️  CONVIRTIENDO SESIONES A INDEFINIDAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    try {
        // Conectar a Redis
        console.log('🔌 Conectando a Redis...');
        await RedisService.connect();

        if (!RedisService.isReady()) {
            throw new Error('No se pudo conectar a Redis');
        }
        console.log('✅ Conectado a Redis correctamente\n');

        // Obtener todas las sesiones de proveedores
        const client = RedisService.getClient();
        const keys = await client.keys('session:provider:*');

        if (keys.length === 0) {
            console.log('ℹ️  No se encontraron sesiones');
            await RedisService.disconnect();
            return;
        }

        console.log(`📋 Encontradas ${keys.length} sesiones:\n`);

        let updated = 0;

        // Remover TTL de cada sesión
        for (const key of keys) {
            try {
                const ttlBefore = await client.ttl(key);

                // PERSIST hace que la clave sea permanente (sin TTL)
                await client.persist(key);

                const ttlAfter = await client.ttl(key);

                console.log(`✅ ${key}`);
                console.log(`   Antes: ${ttlBefore > 0 ? ttlBefore + 's (~' + Math.floor(ttlBefore / 86400) + ' días)' : 'ya era indefinido'}`);
                console.log(`   Ahora: ${ttlAfter === -1 ? 'INDEFINIDO ♾️' : 'TTL: ' + ttlAfter}\n`);

                updated++;
            } catch (error) {
                console.error(`❌ Error procesando ${key}:`, error.message);
            }
        }

        // Resumen
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  📊 RESUMEN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  ✅ Sesiones actualizadas: ${updated}`);
        console.log(`  ♾️  Todas las sesiones ahora son INDEFINIDAS`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        // Desconectar
        await RedisService.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await RedisService.disconnect();
        process.exit(1);
    }
}

// Ejecutar
removeTTL();
