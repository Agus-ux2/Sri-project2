/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MIGRACIÓN DE SESIONES A REDIS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Script de una sola ejecución para migrar sesiones JSON a Redis
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const fs = require('fs');
const path = require('path');
const RedisService = require('../services/redis.service');

async function migrateSessionsToRedis() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🔄 MIGRACIÓN DE SESIONES A REDIS');
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

        // Directorios
        const sessionsDir = path.join(__dirname, '../../storage/sessions');
        const backupDir = path.join(sessionsDir, 'backup');

        // Crear directorio de backup
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Buscar archivos de sesión
        if (!fs.existsSync(sessionsDir)) {
            console.log('⚠️  No se encontró el directorio de sesiones');
            return;
        }

        const files = fs.readdirSync(sessionsDir);
        const sessionFiles = files.filter(f => f.endsWith('.json') && f.includes('_'));

        if (sessionFiles.length === 0) {
            console.log('ℹ️  No se encontraron sesiones para migrar');
            await RedisService.disconnect();
            return;
        }

        console.log(`📋 Encontrados ${sessionFiles.length} archivos de sesión:\n`);

        let migrated = 0;
        let failed = 0;

        // Migrar cada archivo
        for (const file of sessionFiles) {
            try {
                const filePath = path.join(sessionsDir, file);
                const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                const { userId, provider, cookies } = sessionData;

                if (!userId || !provider || !cookies) {
                    console.log(`⚠️  ${file}: Datos incompletos, saltando...`);
                    failed++;
                    continue;
                }

                // Guardar en Redis sin expiración (indefinido)
                const success = await RedisService.saveProviderSession(
                    userId,
                    provider,
                    { cookies },
                    null // Sin expiración
                );

                if (success) {
                    console.log(`✅ ${file} → Redis [session:provider:${userId}:${provider}]`);

                    // Mover a backup
                    const backupPath = path.join(backupDir, file);
                    fs.renameSync(filePath, backupPath);
                    console.log(`   📦 Respaldo creado en: backup/${file}\n`);

                    migrated++;
                } else {
                    console.log(`❌ ${file}: Error al guardar en Redis\n`);
                    failed++;
                }
            } catch (error) {
                console.error(`❌ ${file}: ${error.message}\n`);
                failed++;
            }
        }

        // Resumen
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  📊 RESUMEN DE MIGRACIÓN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  ✅ Migrados exitosamente: ${migrated}`);
        console.log(`  ❌ Fallos: ${failed}`);
        console.log(`  📦 Archivos respaldados en: storage/sessions/backup/`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        // Verificar datos en Redis
        console.log('🔍 Verificando datos en Redis...\n');
        const client = RedisService.getClient();
        const keys = await client.keys('session:provider:*');

        console.log(`📊 Total de sesiones en Redis: ${keys.length}`);
        for (const key of keys) {
            const ttl = await RedisService.ttl(key);
            const days = Math.floor(ttl / 86400);
            const hours = Math.floor((ttl % 86400) / 3600);
            console.log(`   - ${key} (expira en ${days}d ${hours}h)`);
        }

        console.log('');
        console.log('✅ Migración completada exitosamente!');

        // Desconectar
        await RedisService.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        await RedisService.disconnect();
        process.exit(1);
    }
}

// Ejecutar
migrateSessionsToRedis();
