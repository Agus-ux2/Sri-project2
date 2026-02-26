import winston from 'winston';
import config from '../config';

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sri-execution-plane',
    workerId: config.workerId
  },
  transports: [
    new winston.transports.File({
      filename: '/tmp/worker-error.log',
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: '/tmp/worker-combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

// En desarrollo, también a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;

/**
 * Crear logger específico para un job
 */
export function createJobLogger(jobId: string, orgId: string, userId: string) {
  return logger.child({
    jobId,
    orgId,
    userId
  });
}
