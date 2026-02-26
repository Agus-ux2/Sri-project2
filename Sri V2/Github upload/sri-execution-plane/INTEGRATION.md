# 🔗 Guía de Integración: Control Plane ↔ Workers

Esta guía explica cómo conectar el Control Plane con los Workers para tener un sistema funcionando end-to-end.

---

## 📋 Prerequisitos

Antes de comenzar, debes tener:

- ✅ Control Plane funcionando (`sri-control-plane`)
- ✅ PostgreSQL con esquema creado
- ✅ Redis funcionando
- ✅ MinIO o S3 configurado

---

## 🚀 Setup Paso a Paso

### 1. Iniciar Infraestructura Base

```bash
# Desde el directorio raíz
docker-compose -f infrastructure/docker-compose.yml up -d
```

Esto inicia:
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- MinIO (puerto 9000)

### 2. Configurar Secretos Compartidos

**CRÍTICO:** El Control Plane y los Workers deben compartir el mismo `SCRIPT_SIGNING_SECRET`.

```bash
# Generar secreto seguro (hacer solo una vez)
openssl rand -hex 32

# Ejemplo: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Usar este secreto en ambos `.env`:

**sri-control-plane/.env:**
```env
SCRIPT_SIGNING_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**sri-execution-plane/.env:**
```env
SCRIPT_SIGNING_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 3. Iniciar Control Plane

```bash
cd sri-control-plane

# Instalar dependencias
npm install

# Ejecutar migraciones
npm run migration:run

# Iniciar API
npm run dev
```

Verificar que esté funcionando:
```bash
curl http://localhost:3000/health
```

### 4. Crear Buckets en MinIO

```bash
# Conectar a MinIO
mc alias set local http://localhost:9000 minioadmin minioadmin

# Crear buckets
mc mb local/sri-scripts
mc mb local/sri-results

# Verificar
mc ls local
```

### 5. Iniciar Workers

```bash
cd sri-execution-plane

# Instalar dependencias
npm install

# Iniciar worker
npm run dev
```

Verificar en los logs:
```
✓ Redis connected
✓ Playwright initialized
📡 Starting polling loop
```

---

## 🔄 Flujo Completo End-to-End

### Paso 1: Crear Organización

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "SecurePass123!",
    "name": "Admin User",
    "orgName": "Mi Empresa"
  }'
```

Guardar el `token` de la respuesta.

### Paso 2: Obtener Provider ID

```bash
curl http://localhost:3000/api/providers
```

Guardar el `id` de Cargill (o el provider que uses).

### Paso 3: Crear Flow

```bash
curl -X POST http://localhost:3000/api/flows \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "{PROVIDER_ID}",
    "version": "1.0.0",
    "name": "Test Flow",
    "description": "Flujo de prueba",
    "steps": [
      {
        "type": "navigate",
        "url": "https://example.com"
      },
      {
        "type": "screenshot"
      }
    ]
  }'
```

Esto:
- ✅ Genera script automáticamente
- ✅ Calcula hash SHA-256
- ✅ Firma con HMAC
- ✅ Guarda en PostgreSQL

Guardar el `flowId`.

### Paso 4: Activar Flow

```bash
curl -X POST http://localhost:3000/api/flows/{FLOW_ID}/activate \
  -H "Authorization: Bearer {TOKEN}"
```

### Paso 5: Simular Sesión de Usuario

El usuario normalmente conectaría su proveedor desde el frontend, pero para testing manual:

```bash
# Obtener orgId y userId del token
# (decodificar JWT en https://jwt.io)

# Guardar sesión en Redis
redis-cli SET "sri:sessions:{ORG_ID}:{USER_ID}:cargill" '{
  "cookies": [
    {
      "name": "session",
      "value": "test-session-value",
      "domain": "example.com"
    }
  ],
  "connectedAt": 1706292000000
}' EX 604800

# Registrar provider conectado en DB
docker exec sri-postgres psql -U sri sri_production -c "
  INSERT INTO connected_providers (org_id, user_id, provider_id, status)
  VALUES ('{ORG_ID}', '{USER_ID}', '{PROVIDER_ID}', 'active')
  ON CONFLICT DO NOTHING;
"
```

### Paso 6: Ejecutar Job (POST /run)

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "{PROVIDER_ID}",
    "metadata": {
      "test": true
    }
  }'
```

Esto hace:
1. ✅ Control Plane valida orgId + userId
2. ✅ Control Plane verifica provider conectado
3. ✅ Control Plane obtiene flow activo
4. ✅ Control Plane verifica hash del script
5. ✅ Control Plane verifica firma del script
6. ✅ Control Plane encola job en Redis

Guardar el `jobId` de la respuesta.

### Paso 7: Monitorear Ejecución

**En una terminal, ver logs del Worker:**
```bash
cd sri-execution-plane
tail -f logs/worker-combined.log
```

Verás:
```
📦 Processing job
✓ Hash verified
✓ Signature verified
✓ Session loaded
▶ Executing script
📤 Uploading results to S3
✓ Results uploaded to S3
✅ Job completed
```

**En otra terminal, ver estado del job:**
```bash
# Ver estado en Redis
redis-cli GET "sri:job:{JOB_ID}:status"

# Ver resultados en canal
redis-cli SUBSCRIBE "sri:org:{ORG_ID}:done"

# Ver desde API
curl http://localhost:3000/api/jobs/{JOB_ID}/status \
  -H "Authorization: Bearer {TOKEN}"
```

### Paso 8: Verificar Resultados en S3

```bash
# Listar archivos del job
mc ls local/sri-results/results/{ORG_ID}/{USER_ID}/{JOB_ID}/

# Descargar log
mc cat local/sri-results/results/{ORG_ID}/{USER_ID}/{JOB_ID}/execution.log

# Descargar screenshot
mc cat local/sri-results/results/{ORG_ID}/{USER_ID}/{JOB_ID}/screenshot-0.png > screenshot.png
```

---

## 🔍 Debugging

### Ver colas en Redis

```bash
# Ver todas las colas
redis-cli KEYS "sri:org:*:jobs"

# Ver jobs en cola de una org
redis-cli LRANGE "sri:org:{ORG_ID}:jobs" 0 -1

# Ver longitud de cola
redis-cli LLEN "sri:org:{ORG_ID}:jobs"
```

### Ver estado de jobs

```bash
# Estado en Redis
redis-cli GET "sri:job:{JOB_ID}:status"

# Jobs en PostgreSQL
docker exec sri-postgres psql -U sri sri_production -c "
  SELECT id, org_id, status, created_at, updated_at
  FROM jobs
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Ver heartbeat de workers

```bash
redis-cli KEYS "sri:worker:*:heartbeat"
redis-cli GET "sri:worker:worker-1:heartbeat"
```

---

## 🚨 Problemas Comunes

### 1. "Script integrity check failed"

**Causa:** Hash del script no coincide.

**Solución:** El script fue modificado. Crear nueva versión del flow.

### 2. "Script signature verification failed"

**Causa:** Firma HMAC no coincide.

**Verificar:**
```bash
# Control Plane
grep SCRIPT_SIGNING_SECRET sri-control-plane/.env

# Worker
grep SCRIPT_SIGNING_SECRET sri-execution-plane/.env

# Deben ser IDÉNTICOS
```

### 3. Worker no procesa jobs

**Verificar:**

```bash
# Redis funcionando?
redis-cli PING

# Hay colas?
redis-cli KEYS "sri:org:*:jobs"

# Worker está corriendo?
ps aux | grep worker

# Ver logs del worker
tail -f sri-execution-plane/logs/worker-combined.log
```

### 4. "Session not found"

**Causa:** No hay cookies guardadas para usuario+provider.

**Solución:** Ejecutar paso 5 (Simular Sesión) nuevamente.

---

## 📈 Escalado

### Múltiples Workers

```bash
# Terminal 1
WORKER_ID=worker-1 npm start

# Terminal 2
WORKER_ID=worker-2 npm start

# Terminal 3
WORKER_ID=worker-3 npm start
```

Todos los workers comparten las mismas colas de Redis usando round-robin.

### Docker Compose Multi-Worker

```yaml
services:
  worker-1:
    build: ./sri-execution-plane
    environment:
      - WORKER_ID=worker-1
  
  worker-2:
    build: ./sri-execution-plane
    environment:
      - WORKER_ID=worker-2
  
  worker-3:
    build: ./sri-execution-plane
    environment:
      - WORKER_ID=worker-3
```

---

## 🎯 Checklist de Integración

### Antes de ir a producción

- [ ] `SCRIPT_SIGNING_SECRET` idéntico en ambos sistemas
- [ ] `SCRIPT_SIGNING_SECRET` tiene mínimo 32 caracteres
- [ ] Workers NO tienen variables de DB
- [ ] Workers NO tienen variables de API
- [ ] PostgreSQL con Row Level Security habilitado
- [ ] Redis protegido con password (en producción)
- [ ] S3/MinIO con acceso controlado
- [ ] Workers en red interna sin internet
- [ ] Logs estructurados funcionando
- [ ] Heartbeat de workers funcionando
- [ ] Buckets S3 creados (sri-scripts, sri-results)
- [ ] Backups de PostgreSQL configurados
- [ ] Monitoring configurado (Prometheus/Grafana)

---

## 📚 Próximos Pasos

1. **Frontend Dashboard** - Para gestión visual
2. **OCR Integration** - Tesseract para análisis de documentos
3. **Parsers** - Para normalizar datos por provider
4. **Webhooks** - Notificaciones cuando jobs terminan
5. **Auto-scaling** - Workers dinámicos según carga

---

**Última actualización:** Enero 2026
