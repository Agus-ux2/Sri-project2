# Soluciones Rurales Integradas (SRI)

Plataforma empresarial de auditoría forense y control de gestión para productores agropecuarios.

## 🎯 Objetivo del Sistema

Centralizar documentos agropecuarios, analizarlos mediante OCR y aplicar reglas de auditoría y calidad de granos de forma automática.

## 🏗️ Arquitectura General

- **Frontend estático**: HTML/CSS/JavaScript puro
- **Backend**: Node.js + Express
- **OCR**: Motor desacoplado como servicio
- **Base de datos**: SQLite
- **Caché/Sesiones**: Redis (opcional, con fallback a archivos)

## 📁 Estructura del Proyecto

```plaintext
/sri-project
│
├── package.json              # Dependencias backend
├── .env.example              # Plantilla de configuración
├── README.md                 # Este archivo
│
├── /public                   # 🎨 FRONTEND - 100% estático
│   ├── index.html            # Landing corporativa
│   │
│   ├── /auth                 # Autenticación
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── verify-email.html
│   │   └── reset-password.html
│   │
│   ├── /dashboard            # Dashboard productor
│   │   ├── dashboard.html
│   │   ├── upload.html       # Carga de documentos + OCR
│   │   ├── grains.html
│   │   ├── providers.html
│   │   ├── contracts.html
│   │   └── market.html
│   │
│   ├── /admin                # Dashboard admin
│   │   └── admin-dashboard.html
│   │
│   ├── /assets
│   │   ├── /css              # Estilos globales
│   │   ├── /js               # Scripts frontend
│   │   ├── /images           # Imágenes
│   │   └── /icons            # Iconos
│   │
│   └── /shared               # Componentes compartidos
│       ├── navbar.html
│       └── footer.html
│
├── /backend                  # ⚙️ BACKEND - Lógica de negocio
│   ├── server.js             # Entrypoint Express
│   │
│   ├── /config               # Configuración
│   │   ├── env.js
│   │   ├── database.js
│   │   └── mailer.js
│   │
│   ├── /routes               # Rutas HTTP
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── documents.routes.js
│   │   ├── ocr.routes.js
│   │   └── admin.routes.js
│   │
│   ├── /controllers          # Orquestadores
│   │   ├── auth.controller.js
│   │   ├── documents.controller.js
│   │   └── ocr.controller.js
│   │
│   ├── /services             # Lógica reutilizable
│   │   ├── /ocr
│   │   │   ├── ocr.engine.js
│   │   │   ├── nanonets.adapter.js
│   │   │   └── afip.parser.js
│   │   │
│   │   ├── /audit
│   │   │   ├── grain.rules.js
│   │   │   └── quality.engine.js
│   │   │
│   │   ├── mail.service.js
│   │   └── token.service.js
│   │
│   ├── /models               # Modelos de datos
│   │   ├── user.model.js
│   │   ├── document.model.js
│   │   └── task.model.js
│   │
│   ├── /middleware           # Middleware Express
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── upload.middleware.js
│   │
│   └── /utils                # Utilidades
│       ├── file.utils.js
│       ├── logger.js
│       └── validators.js
│
├── /storage                  # Archivos subidos (ignorado en git)
│   ├── /uploads
│   └── database.sqlite
│
└── /logs                     # Logs del sistema
    └── app.log
```

## 🚀 Cómo Ejecutar el Proyecto

### 1. Instalación

```bash
# Clonar el repositorio
git clone [url-del-repo]
cd sri-project

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Configuración

Edita el archivo `.env` con tus credenciales:

- **JWT_SECRET**: Clave secreta para tokens
- **MAIL_USER y MAIL_PASSWORD**: Credenciales de Google Workspace
- **NANONETS_API_KEY**: API key de Nanonets (opcional)
- **REDIS_HOST**: Host de Redis (default: localhost)
- **REDIS_PORT**: Puerto de Redis (default: 6379)
- **REDIS_PASSWORD**: Contraseña de Redis (opcional, requerido en producción)
- **SESSION_SECRET**: Clave secreta para sesiones (cambiar en producción)

### 3. Iniciar Redis (Docker)

```bash
# Iniciar contenedor de Redis
docker run -d -p 6379:6379 --name redis-sri redis:alpine

# Verificar que está corriendo
docker ps
```

> **Nota**: Redis es opcional. El sistema funciona con almacenamiento en archivos JSON si Redis no está disponible.

### 4. Ejecutar

```bash
# Modo producción
npm start

# Modo desarrollo (con auto-reload)
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎨 Filosofía de Separación

### Frontend

- **NO** contiene lógica de negocio
- **NO** conoce OCR ni base de datos
- Solo consume APIs REST
- Maneja sesión y UI

### Backend

- Rutas → Controladores → Servicios
- Concentra todas las reglas de negocio
- Servicios reutilizables
- Middleware de seguridad

### Motor OCR

- Engine propio abstracto
- Adaptadores externos (Nanonets)
- Parsers específicos (AFIP)

## 📡 Contratos API REST

### Autenticación

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/verify-email` - Verificación de email
- `POST /api/auth/reset-password` - Recuperar contraseña

### Documentos

- `GET /api/documents` - Listar documentos del usuario
- `POST /api/documents/upload` - Subir documento
- `GET /api/documents/:id` - Obtener documento específico

### OCR

- `POST /api/ocr/process` - Procesar documento con OCR
- `GET /api/ocr/status/:taskId` - Estado de procesamiento

### Usuario

- `GET /api/user/profile` - Perfil del usuario
- `PUT /api/user/profile` - Actualizar perfil

### Admin (requiere rol admin)

- `GET /api/admin/dashboard` - Dashboard administrativo
- `GET /api/admin/users` - Listar usuarios

## 🔐 Seguridad

- Autenticación JWT
- Passwords hasheados con bcrypt
- Middleware de roles
- Validación de inputs
- CORS configurado

## 🚀 Rendimiento y Caché

### Redis

- **Sesiones de proveedores**: Almacena cookies de Cargill, LDC, etc. en memoria
- **Expiración automática**: TTL de 7 días configurable
- **Fallback a archivos**: Sistema funciona sin Redis
- **Migración automática**: Sesiones legacy se migran automáticamente

**Comandos útiles**:

```bash
# Ver sesiones en Redis
docker exec -it redis-sri redis-cli KEYS "session:provider:*"

# Ver TTL de una sesión
docker exec -it redis-sri redis-cli TTL "session:provider:1:cargill"

# Migrar sesiones existentes
node backend/scripts/migrate-sessions-to-redis.js
```

## 🤖 Reglas para IA / Copilot / Cursor

### ❌ NO HACER

- **NO** mezclar frontend y backend
- **NO** agregar lógica de negocio en el frontend
- **NO** acceder directamente a la base de datos desde el frontend
- **NO** simplificar la arquitectura

### ✅ SÍ HACER

- **SÍ** respetar contratos API
- **SÍ** mantener separación de responsabilidades
- **SÍ** usar servicios reutilizables en backend
- **SÍ** documentar cambios importantes

---

## Troubleshooting

Si experimentás problemas con la plataforma, consultá el documento [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) para soluciones a problemas comunes.

Problemas documentados:

- Botones "Abrir Portal" no funcionan
- Error EADDRINUSE (puerto ocupado)
- Errores 404 de logos de proveedores

---

## Licencia

MIT License - Ver LICENSE para más detalleschos reservados © Soluciones Rurales Integradas
