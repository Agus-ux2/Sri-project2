# Troubleshooting - SRI Platform

## Botones "Abrir Portal" No Funcionan (Proveedores)

### Síntomas

- Al hacer clic en "Abrir Portal" no pasa nada
- No se abre ventana de navegador
- Archivos de log en `/logs` se crean pero están vacíos
- No hay errores visibles en la consola del navegador

### Solución Rápida (PROBAR PRIMERO)

**Archivo**: [`backend/controllers/providers.controller.js:74-75`](file:///c:/Users/Agustin/.gemini/antigravity/sri-project/backend/controllers/providers.controller.js#L74-L75)

Cambiar la configuración del `spawn()`:

```javascript
// ✅ CONFIGURACIÓN QUE FUNCIONA
const child = spawn('node', [...], {
    detached: false,    // Proceso attached
    stdio: 'inherit'    // Hereda streams del padre
});
// NO usar child.unref()
```

**En vez de**:

```javascript
// ❌ CONFIGURACIÓN QUE FALLA EN WINDOWS
const child = spawn('node', [...], {
    detached: true,     // Proceso completamente separado
    stdio: ['ignore', logStream, logStream]  // Streams redirigidos
});
child.unref();
```

**Reiniciar servidor** después del cambio.

### ¿Por Qué Funciona?

En Windows, `spawn()` con `detached: true` y redirección de streams causa problemas cuando el proceso hijo (Playwright) necesita crear ventanas GUI. El modo `detached: false` con `stdio: 'inherit'` permite que el navegador se abra correctamente.

### Soluciones Alternativas (Si la rápida no es suficiente)

Si necesitás procesos detached con logging, probá en este orden:

#### 1. Usar `shell: true` en Windows

```javascript
const child = spawn('node', [...], {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    shell: true  // Añadir esta opción
});
```

#### 2. Crear Wrapper Batch

Crear un archivo `.bat` que ejecute el script y redirigir allí:

```javascript
const child = spawn('cmd.exe', ['/c', 'start', '/b', 'node', scriptPath, ...args], {
    detached: true,
    stdio: 'ignore'
});
```

#### 3. Usar Logger Externo

Implementar logging con Winston/Bunyan en el script `open-provider.js` en vez de redirigir streams.

#### 4. Proceso en Background con PM2

Usar PM2 para manejar procesos en background:

```javascript
const { exec } = require('child_process');
exec(`pm2 start ${scriptPath} --name provider-${provider} -- --provider=${provider} ...`);
```

### Historial de Solución

- **Fecha**: 2026-01-25
- **Problema Identificado**: Procesos detached con streams redirigidos en Windows
- **Solución Aplicada**: `detached: false` + `stdio: 'inherit'`
- **Tiempo de Debug**: ~45 minutos
- **Estado**: ✅ Resuelto y funcionando

### Notas Adicionales

- Esta configuración NO permite logging a archivos automático
- El proceso hijo depende del servidor padre
- Si el servidor se reinicia, se cierran las ventanas de Playwright abiertas
- Para logging, considerar implementar una de las soluciones alternativas

---

## Otros Problemas Comunes

### Error: EADDRINUSE (Puerto 3000 ocupado)

**Síntoma**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solución**:

```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force
```

Luego reiniciar el servidor.

### Errores 404 de Logos

Los logos de algunos proveedores pueden no existir. Ver `providers.html` líneas 244-250 para configurar fallbacks CSS.
