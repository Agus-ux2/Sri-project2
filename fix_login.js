const { initDatabase, getDatabase } = require('./backend/config/database');
const bcrypt = require('bcryptjs');

async function createUser() {
    await initDatabase();
    const db = getDatabase();

    const email = 'agustin@sri.com.ar';
    const password = 'Sripass2024!';
    const name = 'Agustin SRI';

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'admin'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`ℹ️ El usuario ${email} ya existe. Actualizando contraseña...`);
                    db.run(
                        'UPDATE users SET password = ? WHERE email = ?',
                        [hashedPassword, email],
                        (err) => {
                            if (err) console.error('Error actualizando:', err);
                            else console.log('✅ Contraseña actualizada correctamente.');
                            process.exit(0);
                        }
                    );
                } else {
                    console.error('Error:', err);
                    process.exit(1);
                }
            } else {
                console.log(`✅ Usuario ${email} creado exitosamente con ID: ${this.lastID}`);
                process.exit(0);
            }
        }
    );
}

createUser();
