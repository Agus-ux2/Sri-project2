# =============================================
# Stage 1: Builder
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# =============================================
# Stage 2: Production
# =============================================
FROM node:20-alpine

# Instalar Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Playwright para usar Chromium del sistema
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Crear usuario no-root
RUN addgroup -g 1001 -S sri && \
    adduser -S sri -u 1001 -G sri

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Crear directorios necesarios con permisos
RUN mkdir -p logs temp && \
    chown -R sri:sri /app

# Cambiar a usuario no-root
USER sri

# NO exponer puertos (worker no tiene servidor HTTP)

# Health check (verificar que el proceso esté corriendo)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep -f "node dist/worker.js" || exit 1

# Comando de inicio
CMD ["node", "dist/worker.js"]
