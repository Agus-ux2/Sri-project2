/**
 * Job data from Redis queue
 */
export interface JobQueueData {
  jobId: string;
  orgId: string;
  userId: string;

  // Script Execution Fields
  providerId?: string;
  providerName?: string;
  flowId?: string;
  flowVersion?: string;
  scriptContent?: string;
  scriptHash?: string;
  signature?: string;

  // OCR Fields
  type?: 'OCR_PROCESS' | 'SCRIPT_EXECUTION';
  filePath?: string;
  mimeType?: string;

  createdAt: number;
}

/**
 * Session data from Redis
 */
export interface SessionData {
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  credentials?: Record<string, string>;
  connectedAt?: number;
}

/**
 * Job execution result
 */
export interface JobResult {
  jobId: string;
  orgId: string;
  userId: string;
  providerId: string;
  success: boolean;
  error?: string;
  startedAt: number;
  finishedAt: number;
  duration: number;
  logs: string[];
  files: {
    log?: string;
    screenshots: string[];
    download?: string;
    parsedData?: string;
  };
}

/**
 * Worker stats
 */
export interface WorkerStats {
  workerId: string;
  startedAt: number;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDuration: number;
  lastJobAt?: number;
}
