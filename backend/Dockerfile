# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install production dependencies + tsx (needed for seed script)
RUN npm ci --only=production && \
    npm install --no-save tsx

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
# Note: prisma generate doesn't need a real database connection,
# but it validates the schema which requires DATABASE_URL to be set
# Use ARG only for build-time, don't set ENV (let entrypoint handle it at runtime)
ARG DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN DATABASE_URL="$DATABASE_URL" npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]

