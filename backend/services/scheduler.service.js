/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SCHEDULER SERVICE - Programador de tareas diarias
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class SchedulerService {
    constructor() {
        this.tasks = [];
    }

    /**
     * Inicia el programador
     */
    init() {
        console.log('⏰ Inicializando Programador de Tareas (Cron)...');

        // Tarea diaria a las 00:00 (Medianoche)
        cron.schedule('0 0 * * *', () => {
            console.log('🌙 Ejecutando tareas de mantenimiento de medianoche...');
            this.runAllAutomations();
        });

        // Tarea de prueba (opcional - cada hora para logs)
        cron.schedule('0 * * * *', () => {
            console.log('📦 Check de salud del programador: OK');
        });

        console.log('✅ Cron Jobs programados: Medianoche (00:00)');
    }

    /**
     * Ejecuta todos los scripts de automatización grabados
     */
    async runAllAutomations() {
        const automationDir = path.join(__dirname, '../automation');
        if (!fs.existsSync(automationDir)) {
            console.log('ℹ️ No hay scripts de automatización para ejecutar.');
            return;
        }

        const files = fs.readdirSync(automationDir).filter(f => f.endsWith('.js'));
        console.log(`🚀 Iniciando ejecución de ${files.length} scripts automatizados...`);

        for (const file of files) {
            this.runScript(path.join(automationDir, file));
        }
    }

    /**
     * Ejecuta un script individual
     */
    runScript(scriptPath) {
        const fileName = path.basename(scriptPath);
        console.log(`▶️ Ejecutando: ${fileName}`);

        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'ignore'
        });

        child.unref();

        // Log de ejecución simple
        const logPath = path.join(__dirname, '../../logs/automation.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] started: ${fileName}\n`);
    }
}

module.exports = new SchedulerService();
