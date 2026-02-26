import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import config from '../config';
import logger from '../utils/logger';

/**
 * Cliente S3 para Workers
 * Solo accede a:
 * - sri-scripts (lectura)
 * - sri-results (escritura)
 */
class S3Service {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey
      },
      forcePathStyle: true // Necesario para MinIO
    });

    logger.info('S3 client initialized', {
      endpoint: config.s3.endpoint,
      region: config.s3.region
    });
  }

  /**
   * Descargar script desde S3
   */
  async downloadScript(providerId: string, flowVersion: string): Promise<string> {
    const key = `scripts/${providerId}/${flowVersion}.js`;

    try {
      const command = new GetObjectCommand({
        Bucket: config.s3.scriptsBucket,
        Key: key
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Script body is empty');
      }

      const scriptContent = await this.streamToString(response.Body as Readable);

      logger.info('Script downloaded', { key });

      return scriptContent;
    } catch (error) {
      logger.error('Error downloading script', { error, key });
      throw new Error(`Failed to download script: ${key}`);
    }
  }

  /**
   * Descargar archivo genérico
   */
  async downloadFile(bucket: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('File body is empty');
      }

      // Convert stream to Buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks);

    } catch (error) {
      logger.error('Error downloading file', { error, bucket, key });
      throw new Error(`Failed to download file: ${bucket}/${key}`);
    }
  }

  /**
   * Subir resultado del job
   */
  async uploadJobResult(
    orgId: string,
    userId: string,
    jobId: string,
    filename: string,
    content: Buffer | string
  ): Promise<string> {
    const key = `results/${orgId}/${userId}/${jobId}/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: config.s3.resultsBucket,
        Key: key,
        Body: content,
        ContentType: this.getContentType(filename)
      });

      await this.client.send(command);

      logger.info('Job result uploaded', { key });

      return key;
    } catch (error) {
      logger.error('Error uploading job result', { error, key });
      throw error;
    }
  }

  /**
   * Subir log del job
   */
  async uploadJobLog(
    orgId: string,
    userId: string,
    jobId: string,
    logContent: string
  ): Promise<string> {
    return this.uploadJobResult(orgId, userId, jobId, 'execution.log', logContent);
  }

  /**
   * Subir screenshot
   */
  async uploadScreenshot(
    orgId: string,
    userId: string,
    jobId: string,
    screenshotBuffer: Buffer,
    index: number = 0
  ): Promise<string> {
    return this.uploadJobResult(
      orgId,
      userId,
      jobId,
      `screenshot-${index}.png`,
      screenshotBuffer
    );
  }

  /**
   * Subir archivo descargado
   */
  async uploadDownloadedFile(
    orgId: string,
    userId: string,
    jobId: string,
    filename: string,
    fileBuffer: Buffer
  ): Promise<string> {
    return this.uploadJobResult(orgId, userId, jobId, filename, fileBuffer);
  }

  /**
   * Subir JSON con resultados parseados
   */
  async uploadParsedData(
    orgId: string,
    userId: string,
    jobId: string,
    data: any
  ): Promise<string> {
    return this.uploadJobResult(
      orgId,
      userId,
      jobId,
      'parsed-data.json',
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Helper: Stream to string
   */
  private async streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  /**
   * Helper: Detectar content type
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const types: Record<string, string> = {
      'json': 'application/json',
      'log': 'text/plain',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'xml': 'application/xml',
      'html': 'text/html'
    };

    return types[ext || ''] || 'application/octet-stream';
  }
}

export default new S3Service();
