# 🚀 Guía de Despliegue en Railway - SRI

Sigue estos pasos para subir la plataforma a Railway.app utilizando GitHub.

## 1. Preparación en GitHub

1. Crea un nuevo repositorio en tu cuenta de GitHub (ej: `sri-platform`).
2. Sube el contenido de la carpeta `sri-project-deploy` a ese repositorio.

   ```bash
   git init
   git add .
   git commit -m "Initial deploy version"
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

## 2. Despliegue en Railway

1. Ve a [Railway.app](https://railway.app/) e inicia sesión con GitHub.
2. Haz clic en **"New Project"** -> **"Deploy from GitHub repo"**.
3. Selecciona tu repositorio.
4. **IMPORTANTE:** Railway detectará el `package.json` y el `Procfile`.

## 3. Configuración de Variables de Entorno

En Railway, ve a la pestaña **Variables** del proyecto y agrega las siguientes:

| Variable | Valor Recomendado | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto (Railway lo asigna automáticamente) |
| `NODE_ENV` | `production` | Modo de ejecución |
| `SESSION_SECRET` | `una-clave-muy-segura` | Para las sesiones |
| `REDIS_URL` | `redis://...` | **CRÍTICO:** Copia la URL de tu servicio Redis |
| `DATABASE_PATH` | `/app/storage/sri.db` | Ruta a la base de datos |

## 4. Agregar Base de Datos

1. En el mismo proyecto de Railway, haz clic en **"New"** -> **"Database"** -> **"Redis"**.
2. Railway conectará automáticamente el servicio. Copia la `REDIS_URL` (la que empieza con `redis://`) y pégala en la variable `REDIS_URL` de tu servicio web.

## 5. Solución de Problemas (Error 502)

Si ves un error 502, revisa lo siguiente en la pestaña **Logs** de Railway:

1. **Redis Connection Timeout**: Si el servidor tarda mucho en iniciar, asegúrate de haber configurado correctamente la variable `REDIS_URL`. Hemos actualizado el código para que intente conectar por 5s y luego use un fallback, evitando que el servidor se bloquee.
2. **Port Binding**: El servidor ahora escucha explícitamente en `0.0.0.0`, lo cual es obligatorio para Railway.
3. **Falta de Archivos**: Verifica que la carpeta `storage` exista en el repositorio. Hemos incluido un `.gitignore` que permite que la carpeta esté pero no sube el archivo `.db` pesado si no lo deseas (aunque recomendamos subir uno inicial vacío o el que te preparamos).

---
✨ **SRI - Soluciones Rurales Integradas**
