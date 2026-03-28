# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDeps needed to compile TypeScript/nest)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy mail templates (Handlebars files are not compiled by tsc)
# These are served from dist/mail/templates at runtime
COPY --from=builder /app/dist/mail/templates ./dist/mail/templates

# Non-root user for container security
RUN addgroup -S neeve && adduser -S neeve -G neeve
USER neeve

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main"]
