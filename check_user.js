const { initDatabase, getDatabase } = require('./backend/config/database');
const bcrypt = require('bcryptjs');

async function check() {
    await initDatabase();
    const db = getDatabase();

    const email = 'agustin@sri.com.ar';

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }

        if (!user) {
            console.log(`❌ El usuario ${email} NO existe en la base de datos.`);

            // Ver qué usuarios existen
            db.all('SELECT email FROM users', [], (err, rows) => {
                console.log('--- LISTA DE USUARIOS ---');
                rows.forEach(r => console.log(`- ${r.email}`));
                console.log('-------------------------');
                process.exit(0);
            });
            return;
        }

        console.log(`✅ Usuario encontrado:`, { id: user.id, email: user.email, name: user.name });

        const passwordToCheck = 'Sripass2024!';
        const isValid = await bcrypt.compare(passwordToCheck, user.password);
        console.log(`🔑 Validación de contraseña (${passwordToCheck}):`, isValid ? 'VÁLIDA' : 'INVÁLIDA');

        process.exit(0);
    });
}

check();
