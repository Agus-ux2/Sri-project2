import { chromium, Browser, BrowserContext, Page } from 'playwright';

import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import path from 'path';
import { onExit } from 'signal-exit';
import config from '../config';
import logger, { createJobLogger } from '../utils/logger';

/**
 * Executor de Playwright
 * Ejecuta scripts en sandbox aislado
 */
class PlaywrightExecutor {
  private browser: Browser | null = null;
  private tempFiles: Set<string> = new Set();

  constructor() {
    // Cleanup automático en exit
    onExit(() => {
      this.cleanupAllTempFilesSync();
    });
  }

  /**
   * Inicializar browser
   */
  async initialize(): Promise<void> {
    try {
      console.log('Playwright Config:', {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        skipDownload: process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
      });

      this.browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      logger.info('Playwright browser initialized');
    } catch (error) {
      logger.error('Failed to initialize Playwright', { error });
      throw error;
    }
  }

  /**
   * Ejecutar script en sandbox
   */
  async executeScript(
    scriptContent: string,
    sessionData: any,
    jobContext: {
      jobId: string;
      orgId: string;
      userId: string;
      providerId: string;
    }
  ): Promise<ExecutionResult> {
    const jobLogger = createJobLogger(jobContext.jobId, jobContext.orgId, jobContext.userId);
    const startTime = Date.now();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const logs: string[] = [];
    const screenshots: Buffer[] = [];
    let downloadPath: string | null = null;

    try {
      jobLogger.info('Starting script execution');

      // Crear contexto aislado con cookies
      context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      // Cargar cookies si existen
      if (sessionData?.cookies && Array.isArray(sessionData.cookies)) {
        await context.addCookies(sessionData.cookies);
        jobLogger.info('Cookies loaded', { count: sessionData.cookies.length });
      }

      // Crear página
      page = await context.newPage();

      // Setup de listeners para capturar información
      page.on('console', msg => {
        const logMsg = `[Browser Console] ${msg.type()}: ${msg.text()}`;
        logs.push(logMsg);
        jobLogger.debug(logMsg);
      });

      page.on('pageerror', err => {
        const errorMsg = `[Page Error] ${err.message}`;
        logs.push(errorMsg);
        jobLogger.error(errorMsg);
      });

      // Ejecutar script con timeout
      const scriptModule = this.loadScriptModule(scriptContent);

      const executionPromise = scriptModule.executeFlow(page, {
        credentials: sessionData.credentials || {},
        jobId: jobContext.jobId,
        orgId: jobContext.orgId
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Execution timeout')),
          config.timeouts.execution
        );
      });

      const result = await Promise.race([executionPromise, timeoutPromise]) as any;

      jobLogger.info('Script executed successfully', {
        duration: Date.now() - startTime
      });

      // Capturar screenshot final
      const finalScreenshot = await page.screenshot({ fullPage: true });
      screenshots.push(finalScreenshot);

      // Procesar resultado
      if (result.downloadPath) {
        downloadPath = result.downloadPath;
      }

      return {
        success: true,
        logs,
        screenshots,
        downloadPath,
        parsedData: result.parsedData || null,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      jobLogger.error('Script execution failed', {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      // Capturar screenshot de error si es posible
      if (page) {
        try {
          const errorScreenshot = await page.screenshot({ fullPage: true });
          screenshots.push(errorScreenshot);
        } catch (screenshotError) {
          jobLogger.warn('Failed to capture error screenshot');
        }
      }

      return {
        success: false,
        error: error.message,
        logs,
        screenshots,
        downloadPath: null,
        parsedData: null,
        duration: Date.now() - startTime
      };

    } finally {
      // Cleanup
      if (context) {
        await context.close();
      }
    }
  }

  /**
   * Cargar módulo de script de forma segura
   * IMPORTANTE: No usar eval() - escribir a archivo temporal y require()
   */
  private loadScriptModule(scriptContent: string): any {
    // Usar directorio temporal del sistema o local
    const tempDir = process.env.TEMP_DIR || path.join(process.cwd(), 'temp');
    const scriptPath = path.join(tempDir, `script-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);

    try {
      // Crear directorio si no existe
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      this.tempFiles.add(scriptPath);

      // Escribir script a archivo temporal
      writeFileSync(scriptPath, scriptContent);

      // Cargar módulo
      const scriptModule = require(scriptPath);

      if (!scriptModule.executeFlow || typeof scriptModule.executeFlow !== 'function') {
        throw new Error('Script must export executeFlow function');
      }

      return scriptModule;

    } finally {
      // Cleanup inmediato del archivo después de requerirlo (node lo mantiene en cache)
      // Usamos setImmediate para no bloquear el flujo actual, pero asegurar borrado rápido
      setImmediate(() => {
        this.cleanupTempFile(scriptPath);
      });
    }
  }

  private cleanupTempFile(scriptPath: string): void {
    try {
      if (existsSync(scriptPath)) {
        unlinkSync(scriptPath);
      }
      this.tempFiles.delete(scriptPath);

      // Intentar limpiar cache de require para evitar fugas de memoria
      try {
        const resolvedPath = require.resolve(scriptPath);
        delete require.cache[resolvedPath];
      } catch (e) {
        // Ignorar si no se puede resolver
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp script file', { scriptPath, error });
    }
  }

  private cleanupAllTempFilesSync(): void {
    for (const file of this.tempFiles) {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (e) {
        console.error(`Failed to cleanup temp file on exit: ${file}`, e);
      }
    }
    this.tempFiles.clear();
  }

  /**
   * Cerrar browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Playwright browser closed');
    }
  }
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  logs: string[];
  screenshots: Buffer[];
  downloadPath: string | null;
  parsedData: any;
  duration: number;
}

export default new PlaywrightExecutor();
