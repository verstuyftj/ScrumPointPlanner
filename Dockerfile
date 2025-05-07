FROM node:20-slim AS builder

WORKDIR /app

# Configure npm for better network resilience
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000

# Install ALL dependencies (including devDependencies)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Create production image
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies and required build tools
# Install netcat along with production dependencies and required build tools
RUN apt-get update && apt-get install -y netcat-openbsd \
    && npm ci --omit=dev \
    && npm install @vitejs/plugin-react drizzle-kit \
    && npm cache clean --force \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy built files and migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/shared ./shared 
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Start the application with migrations
ENV NODE_ENV=production
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]