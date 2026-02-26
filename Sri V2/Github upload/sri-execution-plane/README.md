# SRI Execution Plane - Workers

Workers aislados y seguros para ejecutar automatizaciones de SRI.

## 🎯 Responsabilidades

El Execution Plane es responsable de:

- ✅ Leer jobs desde Redis (colas por organización)
- ✅ Verificar firma HMAC del script
- ✅ Verificar hash SHA-256 del script
- ✅ Descargar script desde S3 (si es necesario)
- ✅ Cargar cookies desde Redis (por orgId + userId + provider)
- ✅ Ejecutar script en sandbox Playwright
- ✅ Capturar logs, screenshots y archivos
- ✅ Subir resultados a S3
- ✅ Publicar resultado en canal Redis

## ⚠️ Restricciones de Seguridad

### ❌ Lo que el Worker NUNCA hace:

- ❌ **NO accede a PostgreSQL** (base de datos)
- ❌ **NO accede a la API** del Control Plane
- ❌ **NO tiene acceso libre a internet**
- ❌ NO ejecuta código sin verificar firma
- ❌ NO comparte contexto entre jobs
- ❌ NO usa `eval()` o código dinámico sin validar

### ✅ Lo que SÍ hace:

- ✅ Solo comunicación vía **Redis** y **S3**
- ✅ Verifica integridad con **SHA-256**
- ✅ Verifica firma con **HMAC-SHA256**
- ✅ Ejecuta en sandbox **Docker rootless**
- ✅ Filesystem **read-only**
- ✅ Red interna **sin salida a internet**
- ✅ Logs estructurados por job

---

## 🏗️ Arquitectura

```
Redis Queue                Worker Process              S3 Storage
─────────────────         ─────────────────────       ─────────────
sri:org:{orgId}:jobs  →   1. Dequeue Job              
                          2. Verify Hash ✓
                          3. Verify Signature ✓
                          4. Load Cookies
                          5. Execute Playwright
                          6. Capture Results
                          7. Upload to S3         →   results/{orgId}/{userId}/{jobId}/
                          8. Publish Done         →   sri:org:{orgId}:done
```

---

## 🚀 Instalación y Setup

### 1. Prerequisitos

```bash
# Node.js 20+
node --version

# Docker (para deployment)
docker --version
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará:
- `playwright` - Automatización del navegador
- `ioredis` - Cliente Redis
- `@aws-sdk/client-s3` - Cliente S3
- `winston` - Logging estructurado

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
# Redis (solo para colas, NO base de datos)
REDIS_URL=redis://localhost:6379

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_SCRIPTS_BUCKET=sri-scripts
S3_RESULTS_BUCKET=sri-results

# Worker Config
WORKER_ID=worker-1
WORKER_POLL_INTERVAL=5000
WORKER_MAX_JOBS=5

# Script Signing (debe coincidir con Control Plane)
SCRIPT_SIGNING_SECRET=your-hmac-secret-min-32-chars

# Timeouts
PLAYWRIGHT_TIMEOUT=300000
EXECUTION_TIMEOUT=600000
```

### 4. Iniciar Worker

#### Desarrollo (local)

```bash
npm run dev
```

#### Producción (Docker)

```bash
# Build
docker build -t sri-worker:latest .

# Run con docker-compose
docker-compose up -d
```

---

## 📊 Flujo de Ejecución Completo

### Paso 1: Polling

```typescript
// Worker espera jobs de todas las organizaciones activas
const orgIds = await redisService.getActiveOrgIds();
const job = await redisService.dequeueJobFromAnyOrg(orgIds);
```

### Paso 2: Verificación de Seguridad

```typescript
// Verificar hash SHA-256
const hashValid = verifyScriptHash(job.scriptContent, job.scriptHash);
if (!hashValid) {
  throw new Error('Script integrity compromised');
}

// Verificar firma HMAC
const signatureValid = verifyScriptSignature(job.scriptContent, job.signature);
if (!signatureValid) {
  throw new Error('Unauthorized script');
}
```

### Paso 3: Cargar Sesión

```typescript
// Obtener cookies del usuario desde Redis
const sessionData = await redisService.getUserSession(
  job.orgId,
  job.userId,
  job.providerName
);

// sessionData contiene:
// - cookies: Array de cookies del navegador
// - credentials: Credenciales opcionales
// - connectedAt: Timestamp de conexión
```

### Paso 4: Ejecutar Script

```typescript
const result = await playwrightService.executeScript(
  job.scriptContent,
  sessionData,
  {
    jobId: job.jobId,
    orgId: job.orgId,
    userId: job.userId,
    providerId: job.providerId
  }
);

// result contiene:
// - success: boolean
// - logs: string[]
// - screenshots: Buffer[]
// - downloadPath: string | null
// - parsedData: any
// - duration: number
```

### Paso 5: Subir Resultados

```typescript
// Subir logs
await s3Service.uploadJobLog(orgId, userId, jobId, logContent);

// Subir screenshots
for (const screenshot of result.screenshots) {
  await s3Service.uploadScreenshot(orgId, userId, jobId, screenshot);
}

// Subir archivo descargado
if (result.downloadPath) {
  await s3Service.uploadDownloadedFile(orgId, userId, jobId, filename, buffer);
}

// Subir datos parseados
if (result.parsedData) {
  await s3Service.uploadParsedData(orgId, userId, jobId, result.parsedData);
}
```

### Paso 6: Publicar Resultado

```typescript
// Publicar en canal Redis para notificaciones
await redisService.publishJobResult(orgId, {
  jobId,
  orgId,
  userId,
  providerId,
  success: true,
  duration,
  files: {
    log: 's3://...',
    screenshots: ['s3://...'],
    download: 's3://...',
    parsedData: 's3://...'
  }
});

// Actualizar estado en Redis
await redisService.setJobStatus(jobId, 'done');
```

---

## 🐳 Deployment Docker

### Dockerfile Seguro

El Dockerfile implementa múltiples capas de seguridad:

```dockerfile
# Usuario no-root
USER sri:sri (UID 1001)

# Filesystem read-only
read_only: true

# Capabilities mínimas
cap_drop: ALL

# Volumes temporales
tmpfs: /tmp, /app/temp, /app/logs

# Chromium del sistema (sin descargas)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

### Docker Compose con Red Interna

```yaml
networks:
  sri-internal:
    driver: bridge
    internal: true  # SIN acceso a internet
```

El worker solo puede comunicarse con:
- ✅ Redis (puerto 6379, interno)
- ✅ MinIO/S3 (puerto 9000, interno)
- ❌ Internet (bloqueado)
- ❌ PostgreSQL (sin acceso)
- ❌ API (sin acceso)

---

## 📂 Estructura de S3

### Scripts (lectura)

```
sri-scripts/
└── scripts/
    ├── {providerId}/
    │   ├── 1.0.0.js
    │   ├── 1.0.1.js
    │   └── 1.1.0.js
```

### Resultados (escritura)

```
sri-results/
└── results/
    └── {orgId}/
        └── {userId}/
            └── {jobId}/
                ├── execution.log
                ├── screenshot-0.png
                ├── screenshot-1.png
                ├── downloaded-file.pdf
                └── parsed-data.json
```

---

## 🔍 Logging

### Logs Estructurados

Cada job tiene su propio logger con contexto:

```typescript
const jobLogger = createJobLogger(jobId, orgId, userId);

jobLogger.info('Starting execution');
jobLogger.debug('Loaded cookies', { count: 5 });
jobLogger.error('Execution failed', { error });
```

### Formato de Log

```json
{
  "timestamp": "2026-01-26 20:00:00",
  "level": "info",
  "message": "Job completed",
  "service": "sri-execution-plane",
  "workerId": "worker-1",
  "jobId": "uuid",
  "orgId": "uuid",
  "userId": "uuid",
  "duration": 15234
}
```

### Ubicación de Logs

- `logs/worker-combined.log` - Todos los logs
- `logs/worker-error.log` - Solo errores
- S3: `results/{orgId}/{userId}/{jobId}/execution.log` - Log del job

---

## 📊 Monitoreo

### Heartbeat

El worker envía heartbeat cada 30 segundos:

```
sri:worker:{workerId}:heartbeat → timestamp
TTL: 30 segundos
```

### Estadísticas

```typescript
{
  workerId: "worker-1",
  startedAt: 1706292000000,
  totalJobs: 150,
  successfulJobs: 145,
  failedJobs: 5,
  averageDuration: 12500,
  lastJobAt: 1706295600000
}
```

---

## 🧪 Testing

### Test Manual

```bash
# 1. Iniciar worker
npm run dev

# 2. En otra terminal, encolar un job de prueba
redis-cli LPUSH "sri:org:test-org:jobs" '{
  "jobId": "test-job-1",
  "orgId": "test-org",
  "userId": "test-user",
  "providerId": "test-provider",
  "providerName": "test",
  "flowId": "test-flow",
  "flowVersion": "1.0.0",
  "scriptContent": "...",
  "scriptHash": "...",
  "signature": "...",
  "createdAt": 1706292000000
}'

# 3. Ver logs del worker
tail -f logs/worker-combined.log

# 4. Verificar resultado en Redis
redis-cli GET "sri:job:test-job-1:status"
```

---

## 🔐 Seguridad - Checklist

### Pre-Deployment

- [ ] `SCRIPT_SIGNING_SECRET` tiene mínimo 32 caracteres
- [ ] Worker NO tiene variables de DB (`DATABASE_URL`, `POSTGRES_*`)
- [ ] Worker NO tiene variables de API (`API_URL`, `API_KEY`)
- [ ] Docker usa usuario no-root (UID 1001)
- [ ] Filesystem es read-only
- [ ] Red interna sin salida a internet
- [ ] Logs no contienen datos sensibles

### En Ejecución

- [ ] Verificación de hash activada
- [ ] Verificación de firma activada
- [ ] Timeouts configurados
- [ ] Heartbeat funcionando
- [ ] Logs estructurados

---

## 🚨 Troubleshooting

### Worker no procesa jobs

```bash
# Verificar conexión Redis
redis-cli PING

# Ver colas disponibles
redis-cli KEYS "sri:org:*:jobs"

# Ver longitud de cola
redis-cli LLEN "sri:org:{orgId}:jobs"

# Ver heartbeat del worker
redis-cli GET "sri:worker:{workerId}:heartbeat"
```

### Error: "Script integrity compromised"

Esto significa que el hash del script no coincide.

**Causa:** El script fue modificado después de ser firmado.

**Solución:** Crear una nueva versión del flow en el Control Plane.

### Error: "Session not found"

**Causa:** No hay cookies guardadas para este usuario+provider.

**Solución:** El usuario debe reconectar su proveedor desde el dashboard.

### Playwright timeout

**Causa:** El script tardó más de `EXECUTION_TIMEOUT` (default: 10 minutos).

**Solución:** 
1. Aumentar timeout en `.env`
2. Optimizar script para que sea más rápido
3. Revisar si el sitio está caído

---

## 📈 Escalado

### Múltiples Workers

```bash
# Iniciar workers adicionales
WORKER_ID=worker-2 npm start &
WORKER_ID=worker-3 npm start &
WORKER_ID=worker-4 npm start &
```

### Docker Swarm

```yaml
services:
  worker:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sri-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: sri-worker
  template:
    metadata:
      labels:
        app: sri-worker
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
      containers:
      - name: worker
        image: sri-worker:latest
        securityContext:
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
```

---

## 🔄 Actualizaciones

### Actualizar Worker sin Downtime

```bash
# 1. Iniciar nuevo worker
WORKER_ID=worker-2 npm start &

# 2. Detener worker viejo gracefully
kill -SIGTERM {worker-1-pid}

# Worker-1 terminará sus jobs actuales antes de cerrarse
```

---

## 📚 Documentación Adicional

- [Control Plane](../sri-control-plane/README.md)
- [Arquitectura SRI](../sri-architecture.html)
- [Especificaciones](../sri-specs.md)

---

## 📄 Licencia

Propietario - SRI Team

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0
