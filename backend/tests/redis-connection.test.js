/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TEST: CONEXIÓN REDIS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const RedisService = require('../services/redis.service');

async function testRedis() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🧪 TEST DE CONEXIÓN A REDIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    try {
        // Test 1: Conexión
        console.log('1️⃣  Probando conexión...');
        await RedisService.connect();
        console.log('   ✅ Conectado a Redis\n');

        // Test 2: SET/GET básico
        console.log('2️⃣  Probando operaciones básicas (SET/GET)...');
        const testKey = 'test:sri:connection';
        const testValue = { message: 'SRI Platform', timestamp: new Date().toISOString() };

        await RedisService.set(testKey, testValue, 60);
        console.log('   ✅ SET ejecutado correctamente');

        const retrieved = await RedisService.get(testKey);
        console.log('   ✅ GET ejecutado correctamente');
        console.log('   📊 Valor recuperado:', retrieved);

        if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
            console.log('   ✅ Valores coinciden\n');
        } else {
            console.log('   ❌ Valores NO coinciden\n');
        }

        // Test 3: TTL
        console.log('3️⃣  Probando TTL...');
        const ttl = await RedisService.ttl(testKey);
        console.log(`   ✅ TTL: ${ttl} segundos\n`);

        // Test 4: Sesión de proveedor
        console.log('4️⃣  Probando sesión de proveedor...');
        const testSession = {
            cookies: [
                { name: 'test_cookie', value: 'test_value_123', domain: '.test.com' }
            ]
        };

        await RedisService.saveProviderSession(999, 'test-provider', testSession, 60);
        console.log('   ✅ Sesión guardada');

        const session = await RedisService.getProviderSession(999, 'test-provider');
        console.log('   ✅ Sesión recuperada:', session);

        // Test 5: Listar sesiones
        console.log('\n5️⃣  Probando listado de sesiones...');
        const sessions = await RedisService.listProviderSessions(999);
        console.log(`   ✅ Sesiones encontradas: ${sessions.length}`);
        console.log('   📊 Sesiones:', sessions);

        // Test 6: Eliminar
        console.log('\n6️⃣  Probando eliminación...');
        await RedisService.deleteProviderSession(999, 'test-provider');
        console.log('   ✅ Sesión eliminada');

        const deletedSession = await RedisService.getProviderSession(999, 'test-provider');
        if (deletedSession === null) {
            console.log('   ✅ Sesión no existe (correcto)\n');
        } else {
            console.log('   ❌ Sesión todavía existe (error)\n');
        }

        // Limpiar clave de test
        await RedisService.delete(testKey);

        // Resumen
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ✅ TODOS LOS TESTS PASARON CORRECTAMENTE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        await RedisService.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('  ❌ TEST FALLIDO');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('  Error:', error.message);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');

        await RedisService.disconnect();
        process.exit(1);
    }
}

// Ejecutar
testRedis();
