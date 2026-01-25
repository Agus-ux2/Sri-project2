/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CONFIGURACIÓN DE BASE DE DATOS SQLITE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const env = require('./env');

let db = null;

/**
 * Inicializa la base de datos
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        // Crear directorio storage si no existe
        const storageDir = path.dirname(env.DATABASE_PATH);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        // Crear/abrir base de datos
        db = new sqlite3.Database(env.DATABASE_PATH, (err) => {
            if (err) {
                console.error('❌ Error abriendo base de datos:', err);
                reject(err);
                return;
            }

            console.log('✅ Base de datos SQLite conectada');

            // Crear tablas
            db.serialize(() => {
                // Tabla de usuarios
                db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            email_verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
                    if (err) console.error('Error creando tabla users:', err);
                });

                // Tabla de documentos
                db.run(`
          CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            ocr_status TEXT DEFAULT 'pending',
            ocr_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
                    if (err) console.error('Error creando tabla documents:', err);
                });

                // Tabla de tareas OCR
                db.run(`
          CREATE TABLE IF NOT EXISTS ocr_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            extracted_data TEXT,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
          )
        `, (err) => {
                    if (err) console.error('Error creando tabla ocr_tasks:', err);
                });

                // Tabla de granos
                db.run(`
          CREATE TABLE IF NOT EXISTS grains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            grain_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            quality_grade TEXT,
            humidity REAL,
            location TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
                    if (err) console.error('Error creando tabla grains:', err);
                });

                // Tabla de contratos
                db.run(`
          CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contract_number TEXT,
            provider TEXT NOT NULL,
            grain_type TEXT,
            quantity REAL,
            price REAL,
            delivery_date DATE,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
                    if (err) console.error('Error creando tabla contracts:', err);
                    else console.log('✅ Tablas creadas correctamente');
                    resolve(db);
                });
            });
        });
    });
}

/**
 * Obtiene instancia de la base de datos
 */
function getDatabase() {
    if (!db) {
        throw new Error('Base de datos no inicializada. Llame a initDatabase() primero.');
    }
    return db;
}

module.exports = {
    initDatabase,
    getDatabase
};
