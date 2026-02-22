FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Skip linting and type checking for production build to save memory
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -- --no-lint

# =============================================
# Stage 2: Production
# =============================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Usuario no-root
RUN addgroup -S sri && adduser -S sri -G sri
USER sri

EXPOSE 3000

CMD ["node", "server.js"]
