# ==========================================
# Stage 1: Production dependencies
# ==========================================
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# ==========================================
# Stage 2: Production runtime
# ==========================================
FROM node:24-alpine AS runtime
ARG PORT=3000
ENV PORT=${PORT}
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application source and pre-built admin panel
COPY --chown=appuser:nodejs src ./src
COPY --chown=appuser:nodejs admin ./admin
COPY --chown=appuser:nodejs package.json ./

USER appuser
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1

CMD ["node", "src/app.js"]
