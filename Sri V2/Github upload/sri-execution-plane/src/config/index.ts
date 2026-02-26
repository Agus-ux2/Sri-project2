import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

interface WorkerConfig {
  workerId: string;
  redis: {
    url: string;
  };
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    scriptsBucket: string;
    resultsBucket: string;
    docsBucket: string;
  };
  polling: {
    interval: number;
    maxJobs: number;
  };
  signing: {
    secret: string;
  };
  timeouts: {
    playwright: number;
    execution: number;
  };
  logging: {
    level: string;
  };
}

const config: WorkerConfig = {
  workerId: process.env.WORKER_ID || `worker-${Math.random().toString(36).substring(7)}`,
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    scriptsBucket: process.env.S3_SCRIPTS_BUCKET || 'sri-scripts',
    resultsBucket: process.env.S3_RESULTS_BUCKET || 'sri-results',
    docsBucket: process.env.S3_BUCKET_NAME || 'sri-docs-v2'
  },
  polling: {
    interval: parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10),
    maxJobs: parseInt(process.env.WORKER_MAX_JOBS || '5', 10)
  },
  signing: {
    secret: process.env.SCRIPT_SIGNING_SECRET || 'dev-signing-secret'
  },
  timeouts: {
    playwright: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '300000', 10),
    execution: parseInt(process.env.EXECUTION_TIMEOUT || '600000', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validaciones de seguridad
if (config.signing.secret.length < 32 && process.env.NODE_ENV === 'production') {
  throw new Error('SCRIPT_SIGNING_SECRET must be at least 32 characters in production');
}

// SEGURIDAD: Verificar que NO haya variables de DB o API
const forbidden = ['DATABASE_URL', 'API_URL', 'POSTGRES_'];
for (const key of Object.keys(process.env)) {
  if (forbidden.some(f => key.includes(f))) {
    console.warn(`⚠️  WARNING: Worker should not have access to ${key}`);
  }
}

export default config;
