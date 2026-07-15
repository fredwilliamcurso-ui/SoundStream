# Use a reliable, long-term support Node.js image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Optimize Node memory limits for compilation inside resource-constrained build environments
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Copy dependency catalogs
COPY package*.json ./

# Install dependencies including development ones for build stage
RUN npm ci

# Copy all application source code
COPY . .

# Run the production build process
# This executes:
# 1) Vite production compilation of the React frontend into /dist
# 2) Esbuild bundling of server.ts into /dist/server.cjs
RUN npm run build

# --- Stage 2: Lean Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

# Configure environmental production defaults
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency catalogs
COPY package*.json ./

# Install ONLY production dependencies to keep the container lightweight and cold-starts extremely fast
RUN npm ci --only=production

# Copy static assets and compiled application code from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy local persistence descriptors and config files if present
COPY --from=builder /app/firebase-applet-config.json* ./
COPY --from=builder /app/billing_db.json* ./

# Expose standard port
EXPOSE 3000

# Boot the compiled CommonJS server using Node.js
CMD ["node", "dist/server.cjs"]
