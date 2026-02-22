FROM node:20-alpine AS builder

WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json tsconfig.json ./

# Instalar dependencias completas
RUN npm install

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# =============================================
# Stage 2: Production
# =============================================
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias y build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Instalar solo dependencias de producción
RUN npm install --only=production && \
    npm cache clean --force

# Usuario no-root
RUN addgroup -S sri && adduser -S sri -G sri
USER sri

EXPOSE 3000

CMD ["node", "dist/index.js"]
