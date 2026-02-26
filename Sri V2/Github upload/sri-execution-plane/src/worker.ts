import config from './config';
import logger, { createJobLogger } from './utils/logger';
import { verifyScriptHash, verifyScriptSignature } from './utils/crypto';
import redisService from './services/redis.service';
import s3Service from './services/s3.service';
import playwrightService from './services/playwright.service';
import { JobQueueData, JobResult, WorkerStats } from './types';

/**
 * SRI Execution Plane Worker
 * 
 * Este worker:
 * 1. Lee jobs desde Redis
 * 2. Verifica firma + hash
 * 3. Descarga script desde S3 (si es necesario)
 * 4. Carga cookies desde Redis
 * 5. Ejecuta en sandbox Playwright
 * 6. Sube logs y archivos a S3
 * 7. Publica resultado en sri:org:{orgId}:done
 * 
 * SEGURIDAD:
 * - NO accede a base de datos
 * - NO accede a API del Control Plane
 * - Solo comunicación vía Redis y S3
 */
class SRIWorker {
  private isRunning: boolean = false;
  private currentJobs: number = 0;
  private stats: WorkerStats;

  constructor() {
    this.stats = {
      workerId: config.workerId,
      startedAt: Date.now(),
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageDuration: 0
    };
  }

  /**
   * Inicializar worker
   */
  async start(): Promise<void> {
    logger.info('🚀 SRI Worker starting', {
      workerId: config.workerId,
      pollingInterval: config.polling.interval,
      maxJobs: config.polling.maxJobs
    });

    try {
      // Conectar Redis
      await redisService.connect();
      logger.info('✓ Redis connected');

      // Inicializar Playwright (Optional for OCR)
      try {
        await playwrightService.initialize();
        logger.info('✓ Playwright initialized');
      } catch (e: any) {
        logger.warn('Failed to initialize Playwright - Script execution will fail, but OCR should work', { error: e.message });
      }

      // Marcar como running
      this.isRunning = true;

      // Iniciar polling loop
      await this.pollingLoop();

    } catch (error: any) {
      console.error('CRITICAL WORKER STARTUP ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      logger.error('Failed to start worker', { error });
      process.exit(1);
    }
  }

  /**
   * Loop principal de polling
   */
  private async pollingLoop(): Promise<void> {
    logger.info('📡 Starting polling loop');

    while (this.isRunning) {
      try {
        // Heartbeat
        await redisService.heartbeat();

        // Verificar si podemos tomar más jobs
        if (this.currentJobs >= config.polling.maxJobs) {
          await this.sleep(config.polling.interval);
          continue;
        }

        // Obtener organizaciones activas
        const orgIds = await redisService.getActiveOrgIds();

        if (orgIds.length === 0) {
          logger.debug('No active organizations found');
          await this.sleep(config.polling.interval);
          continue;
        }

        logger.debug('Polling for jobs', { orgCount: orgIds.length });

        // Intentar obtener job (blocking)
        const job = await redisService.dequeueJobFromAnyOrg(orgIds, 5);

        if (job) {
          // Procesar job de forma asíncrona
          this.currentJobs++;
          this.processJob(job)
            .finally(() => {
              this.currentJobs--;
            });
        }

      } catch (error) {
        logger.error('Error in polling loop', { error });
        await this.sleep(5000); // Esperar 5 segundos antes de reintentar
      }
    }
  }

  /**
   * Procesar un job
   */
  private async processJob(jobData: JobQueueData): Promise<void> {
    const jobLogger = createJobLogger(jobData.jobId, jobData.orgId, jobData.userId);
    const startTime = Date.now();

    jobLogger.info('📦 Processing job', {
      providerId: jobData.providerId,
      providerName: jobData.providerName,
      flowVersion: jobData.flowVersion
    });

    try {
      // 1. Actualizar estado a "running"
      await redisService.setJobStatus(jobData.jobId, 'running');

      if (jobData.type === 'OCR_PROCESS') {
        const ocrLogger = createJobLogger(jobData.jobId, jobData.orgId, jobData.userId);
        await this.processOCRJob(jobData, ocrLogger, startTime);
        return;
      }

      // SCRIPT EXECUTION FLOW
      // 2. Verificar datos requeridos
      if (!jobData.scriptContent || !jobData.scriptHash || !jobData.signature || !jobData.providerName) {
        throw new Error('Missing required fields (scriptContent, signature, providerName) for SCRIPT_EXECUTION');
      }

      // Helper vars for TS
      const scriptContent = jobData.scriptContent;
      const scriptHash = jobData.scriptHash;
      const signature = jobData.signature;
      const providerName = jobData.providerName;

      // 2. Verificar hash del script
      const hashValid = verifyScriptHash(scriptContent, scriptHash);
      if (!hashValid) {
        throw new Error('Script hash verification failed - integrity compromised');
      }
      jobLogger.info('✓ Hash verified');

      // 3. Verificar firma del script
      const signatureValid = verifyScriptSignature(scriptContent, signature);
      if (!signatureValid) {
        throw new Error('Script signature verification failed - unauthorized script');
      }
      jobLogger.info('✓ Signature verified');

      // 4. Obtener sesión (cookies) desde Redis
      const sessionData = await redisService.getUserSession(
        jobData.orgId,
        jobData.userId,
        providerName
      );

      if (!sessionData) {
        throw new Error('Session not found - user needs to reconnect provider');
      }
      jobLogger.info('✓ Session loaded', {
        hasCookies: !!sessionData.cookies,
        cookieCount: sessionData.cookies?.length || 0
      });

      // 5. Ejecutar script en Playwright
      jobLogger.info('▶ Executing script');
      const executionResult = await playwrightService.executeScript(
        scriptContent,
        sessionData,
        {
          jobId: jobData.jobId,
          orgId: jobData.orgId,
          userId: jobData.userId,
          providerId: jobData.providerId || 'unknown'
        }
      );

      // 6. Subir resultados a S3
      jobLogger.info('📤 Uploading results to S3');

      const s3Files: {
        log?: string;
        screenshots: string[];
        download?: string;
        parsedData?: string;
      } = { screenshots: [] };

      // Subir logs
      const logContent = [
        `Job ID: ${jobData.jobId}`,
        `Org ID: ${jobData.orgId}`,
        `User ID: ${jobData.userId}`,
        `Provider: ${providerName}`,
        `Flow Version: ${jobData.flowVersion || 'N/A'}`,
        `Started: ${new Date(startTime).toISOString()}`,
        `Duration: ${executionResult.duration}ms`,
        `Success: ${executionResult.success}`,
        '',
        '=== Execution Logs ===',
        ...executionResult.logs,
        '',
        executionResult.error ? `Error: ${executionResult.error}` : 'Completed successfully'
      ].join('\n');

      s3Files.log = await s3Service.uploadJobLog(
        jobData.orgId,
        jobData.userId,
        jobData.jobId,
        logContent
      );

      // Subir screenshots
      // s3Files.screenshots initialized above
      for (let i = 0; i < executionResult.screenshots.length; i++) {
        const screenshotKey = await s3Service.uploadScreenshot(
          jobData.orgId,
          jobData.userId,
          jobData.jobId,
          executionResult.screenshots[i],
          i
        );
        s3Files.screenshots.push(screenshotKey);
      }

      // Subir archivo descargado (si existe)
      if (executionResult.downloadPath) {
        try {
          const fs = require('fs');
          const fileBuffer = fs.readFileSync(executionResult.downloadPath);
          const filename = require('path').basename(executionResult.downloadPath);

          s3Files.download = await s3Service.uploadDownloadedFile(
            jobData.orgId,
            jobData.userId,
            jobData.jobId,
            filename,
            fileBuffer
          );

          // Cleanup local file
          fs.unlinkSync(executionResult.downloadPath);
        } catch (error) {
          jobLogger.warn('Failed to upload downloaded file', { error });
        }
      }

      // Subir datos parseados (si existen)
      if (executionResult.parsedData) {
        s3Files.parsedData = await s3Service.uploadParsedData(
          jobData.orgId,
          jobData.userId,
          jobData.jobId,
          executionResult.parsedData
        );
      }

      jobLogger.info('✓ Results uploaded to S3', {
        filesUploaded: Object.keys(s3Files).length
      });

      // 7. Preparar resultado
      const result: JobResult = {
        jobId: jobData.jobId,
        orgId: jobData.orgId,
        userId: jobData.userId,
        providerId: jobData.providerId || 'unknown',
        success: executionResult.success,
        error: executionResult.error,
        startedAt: startTime,
        finishedAt: Date.now(),
        duration: executionResult.duration,
        logs: executionResult.logs,
        files: s3Files
      };

      // 8. Actualizar estado final
      await redisService.setJobStatus(
        jobData.jobId,
        executionResult.success ? 'done' : 'error'
      );

      // 9. Publicar resultado en canal de completados
      await redisService.publishJobResult(jobData.orgId, result);

      // 10. Actualizar estadísticas
      this.updateStats(executionResult.success, executionResult.duration);

      jobLogger.info('✅ Job completed', {
        success: executionResult.success,
        duration: Date.now() - startTime,
        totalDuration: executionResult.duration
      });

    } catch (error: any) {
      jobLogger.error('❌ Job failed', {
        error: error.message,
        stack: error.stack
      });

      // Actualizar estado a error
      await redisService.setJobStatus(jobData.jobId, 'error');

      // Publicar resultado de error
      const errorResult: JobResult = {
        jobId: jobData.jobId,
        orgId: jobData.orgId,
        userId: jobData.userId,
        providerId: jobData.providerId || 'unknown',
        success: false,
        error: error.message,
        startedAt: startTime,
        finishedAt: Date.now(),
        duration: Date.now() - startTime,
        logs: [error.stack || error.message],
        files: {
          screenshots: []
        }
      };

      await redisService.publishJobResult(jobData.orgId, errorResult);

      this.updateStats(false, Date.now() - startTime);
    }
  }

  /**
   * Actualizar estadísticas del worker
   */
  private updateStats(success: boolean, duration: number): void {
    this.stats.totalJobs++;

    if (success) {
      this.stats.successfulJobs++;
    } else {
      this.stats.failedJobs++;
    }

    // Calcular average duration
    const totalDuration = this.stats.averageDuration * (this.stats.totalJobs - 1) + duration;
    this.stats.averageDuration = Math.round(totalDuration / this.stats.totalJobs);

    this.stats.lastJobAt = Date.now();

    // Log stats cada 10 jobs
    if (this.stats.totalJobs % 10 === 0) {
      logger.info('📊 Worker stats', this.stats);
    }
  }

  /**
   * Detener worker gracefully
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping worker gracefully...');

    this.isRunning = false;

    // Esperar que terminen los jobs actuales
    const maxWait = 60000; // 60 segundos
    const startWait = Date.now();

    while (this.currentJobs > 0 && (Date.now() - startWait) < maxWait) {
      logger.info(`Waiting for ${this.currentJobs} jobs to complete...`);
      await this.sleep(1000);
    }

    if (this.currentJobs > 0) {
      logger.warn(`Force stopping with ${this.currentJobs} jobs still running`);
    }

    // Cerrar conexiones
    await playwrightService.close();
    await redisService.disconnect();

    logger.info('✓ Worker stopped', {
      finalStats: this.stats
    });
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Procesar job de OCR
   */
  private async processOCRJob(jobData: JobQueueData, jobLogger: any, startTime: number): Promise<void> {
    jobLogger.info('📄 Processing OCR job', {
      filePath: jobData.filePath,
      mimeType: jobData.mimeType
    });

    try {
      // 1. Descargar archivo
      jobLogger.info('⬇ Downloading file from S3');
      const bucketName = config.s3.docsBucket;
      const fileBuffer = await s3Service.downloadFile(bucketName, jobData.filePath!);

      jobLogger.info('✓ File downloaded', { size: fileBuffer.length });

      // 2. Mock OCR Processing
      jobLogger.info('⚙ Running OCR extraction...');
      await this.sleep(1000); // Simulate processing

      const extractedText = `[MOCK OCR RESULT]\nExtracted text from ${jobData.filePath}\nDate: ${new Date().toISOString()}\nContent: This is a verified document upload.`;

      jobLogger.info('✓ OCR completed');

      // 3. Subir resultados
      jobLogger.info('📤 Uploading results to S3');

      const parsedData = {
        text: extractedText,
        metadata: {
          originalName: jobData.filePath,
          processedAt: new Date().toISOString(),
          confidence: 0.99
        }
      };

      const parsedDataKey = await s3Service.uploadParsedData(
        jobData.orgId,
        jobData.userId,
        jobData.jobId,
        parsedData
      );

      const logContent = [
        `Job ID: ${jobData.jobId}`,
        `Type: OCR_PROCESS`,
        `File: ${jobData.filePath}`,
        `Processed At: ${new Date().toISOString()}`,
        `Result: Success`,
        `Extracted Text Preview: ${extractedText.substring(0, 100)}...`
      ].join('\n');

      const logKey = await s3Service.uploadJobLog(
        jobData.orgId,
        jobData.userId,
        jobData.jobId,
        logContent
      );

      jobLogger.info('✓ Results uploaded', { parsedDataKey, logKey });

      // 4. Update Status and Publish
      const result: JobResult = {
        jobId: jobData.jobId,
        orgId: jobData.orgId,
        userId: jobData.userId,
        providerId: 'ocr-engine',
        success: true,
        startedAt: startTime,
        finishedAt: Date.now(),
        duration: Date.now() - startTime,
        logs: [logContent],
        files: {
          parsedData: parsedDataKey,
          log: logKey,
          screenshots: []
        }
      };

      await redisService.setJobStatus(jobData.jobId, 'done');
      await redisService.publishJobResult(jobData.orgId, result);

      this.updateStats(true, Date.now() - startTime);
      jobLogger.info('✅ OCR Job completed successfully');

    } catch (error: any) {
      jobLogger.error('❌ OCR Job failed', { error: error.message });
      await redisService.setJobStatus(jobData.jobId, 'error');

      const errorResult: JobResult = {
        jobId: jobData.jobId,
        orgId: jobData.orgId,
        userId: jobData.userId,
        providerId: 'ocr-engine',
        success: false,
        error: error.message,
        startedAt: startTime,
        finishedAt: Date.now(),
        duration: Date.now() - startTime,
        logs: [error.message],
        files: { screenshots: [] }
      };
      await redisService.publishJobResult(jobData.orgId, errorResult);
      this.updateStats(false, Date.now() - startTime);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats(): WorkerStats {
    return { ...this.stats };
  }
}

// =============================================
// ENTRY POINT
// =============================================

const worker = new SRIWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await worker.stop();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Start worker
worker.start().catch((error) => {
  logger.error('Fatal error starting worker', { error });
  process.exit(1);
});

export default worker;
