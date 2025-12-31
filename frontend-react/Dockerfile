# ---- Build Stage ----
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build

# ---- Serve Stage ----
FROM caddy:2-alpine

# Copy the Caddyfile for docker
COPY Caddyfile.docker /etc/caddy/Caddyfile

# Copy the built static files from the build stage
COPY --from=build /app/dist /usr/share/caddy

# Expose the port Caddy listens on
EXPOSE 80
