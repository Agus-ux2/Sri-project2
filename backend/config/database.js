/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CONFIGURACIÓN DE BASE DE DATOS POSTGRESQL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { Pool } = require('pg');
const env = require('./env');

let pool = null;

/**
 * Inicializa el pool de conexiones a PostgreSQL
 */
function initDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // Configurar pool de conexiones
      const connectionString = process.env.DATABASE_URL ||
        'postgresql://localhost:5432/sri_db';

      pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false,
        connectionTimeoutMillis: 5000,  // 5 second timeout for getting connection
        idleTimeoutMillis: 30000,       // 30 seconds before idle client is closed
        max: 10,                         // maximum number of clients
        statement_timeout: 10000,        // 10 second query timeout
        query_timeout: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });

      // Verificar conexión
      const client = await pool.connect();
      console.log('✅ PostgreSQL conectado exitosamente');

      // Crear tablas si no existen
      await createTables(client);

      client.release();
      resolve(pool);
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error);
      reject(error);
    }
  });
}

/**
 * Crea las tablas necesarias
 */
async function createTables(client) {
  try {
    // Tabla de usuarios
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                email_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tabla de documentos
    await client.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_type VARCHAR(100),
                file_size INTEGER,
                ocr_status VARCHAR(50) DEFAULT 'pending',
                ocr_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tabla de tareas OCR
    await client.query(`
            CREATE TABLE IF NOT EXISTS ocr_tasks (
                id SERIAL PRIMARY KEY,
                document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'pending',
                extracted_data TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        `);

    // Tabla de granos
    await client.query(`
            CREATE TABLE IF NOT EXISTS grains (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                grain_type VARCHAR(100) NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL,
                quality_grade VARCHAR(50),
                humidity DECIMAL(5, 2),
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tabla de contratos
    await client.query(`
            CREATE TABLE IF NOT EXISTS contracts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                contract_number VARCHAR(100),
                provider VARCHAR(100) NOT NULL,
                grain_type VARCHAR(100),
                quantity DECIMAL(10, 2),
                price DECIMAL(10, 2),
                delivery_date DATE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tablas nuevas para Mis Granos V2
    await client.query(`
        CREATE TABLE IF NOT EXISTS production_zones (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255),
            hectares DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS grain_stocks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            production_zone_id INTEGER REFERENCES production_zones(id) ON DELETE CASCADE,
            grain_type VARCHAR(100) NOT NULL,
            campaign VARCHAR(50) NOT NULL,
            initial_stock DECIMAL(15, 2) DEFAULT 0,
            sold_delivered DECIMAL(15, 2) DEFAULT 0,
            livestock_consumption DECIMAL(15, 2) DEFAULT 0,
            seeds DECIMAL(15, 2) DEFAULT 0,
            extruder_own DECIMAL(15, 2) DEFAULT 0,
            extruder_exchange DECIMAL(15, 2) DEFAULT 0,
            exchanges DECIMAL(15, 2) DEFAULT 0,
            committed_sales DECIMAL(15, 2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, production_zone_id, grain_type, campaign)
        )
    `);

    console.log('✅ Tablas PostgreSQL creadas correctamente');
  } catch (error) {
    console.error('Error creando tablas:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia del pool
 */
function getDatabase() {
  if (!pool) {
    throw new Error('Base de datos no inicializada. Llame a initDatabase() primero.');
  }
  return pool;
}

/**
 * Ejecuta un query con manejo de errores
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Cierra el pool de conexiones
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Conexión PostgreSQL cerrada');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  query,
  closeDatabase
};
