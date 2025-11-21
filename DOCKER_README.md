# Docker Setup Guide

This document provides detailed instructions for running the Angular Chat App in Docker containers.

## Prerequisites

- Docker Engine (20.10.0 or later)
- Docker Compose (1.29.0 or later)

## Overview

This project includes two Docker configurations:

1. **Production Build** - Multi-stage build with Nginx serving the optimized Angular app
2. **Development Server** - Node container with live-reload for development

## Quick Start

### Production Build

Run the production-optimized app:

```bash
npm run docker:compose:prod
```

Access the app at: http://localhost:8080

Or using direct Docker commands:

```bash
npm run docker:build
npm run docker:run
```

### Development Build

Run the development server with hot-reload:

```bash
npm run docker:compose:dev
```

Access the app at: http://localhost:4200

## Available Docker Commands

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build the production Docker image |
| `npm run docker:run` | Run the production container (port 8080) |
| `npm run docker:compose:dev` | Start development server (port 4200) |
| `npm run docker:compose:prod` | Start production server (port 8080) |

### Docker Compose Commands

```bash
# Start services
docker compose up angular-dev     # Development
docker compose up angular-app     # Production

# Start in detached mode (background)
docker compose up -d angular-dev

# Stop services
docker compose down

# View logs
docker compose logs -f angular-dev

# Rebuild containers
docker compose up --build angular-app
```

## Configuration Files

### Dockerfile

The `Dockerfile` uses a multi-stage build:

1. **Build Stage**: Uses Node 20 Alpine to build the Angular app
2. **Serve Stage**: Uses Nginx Alpine to serve the built app

### docker-compose.yml

Defines two services:

- **angular-app**: Production build with Nginx (port 8080)
- **angular-dev**: Development server with hot-reload (port 4200)

### nginx.conf

Custom Nginx configuration for:
- Single-page application routing
- Static asset caching
- Optimal performance headers

### .dockerignore

Prevents unnecessary files from being copied into the Docker image:
- `node_modules`
- `dist`
- Version control files
- IDE configurations

## Environment Variables

The development container uses:

- `NODE_ENV=development` - Sets Node environment
- `NG_CLI_ANALYTICS=false` - Disables Angular CLI analytics
- `CHOKIDAR_USEPOLLING=1` - Enables file watching in Docker
- `WATCHPACK_POLLING=true` - Ensures changes are detected

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Check what's using the port
lsof -i :8080  # or :4200

# Stop the conflicting service or change the port in docker-compose.yml
```

### File Changes Not Detected (Development)

The docker-compose.yml includes polling configurations for file watching. If changes still aren't detected:

1. Restart the container: `docker compose restart angular-dev`
2. Try rebuilding: `docker compose up --build angular-dev`

### Build Failures

If the build fails:

1. Clear Docker cache: `docker system prune -a`
2. Rebuild from scratch: `docker compose up --build`
3. Check logs: `docker compose logs angular-app`

### Firebase Configuration

Make sure you have a valid Firebase configuration in your environment before deploying. The app requires Firebase for authentication and Firestore.

## Production Deployment

For production deployment:

1. Build the Docker image:
   ```bash
   docker build -t angular-chat-app:v1.0 .
   ```

2. Tag for your registry:
   ```bash
   docker tag angular-chat-app:v1.0 your-registry/angular-chat-app:v1.0
   ```

3. Push to registry:
   ```bash
   docker push your-registry/angular-chat-app:v1.0
   ```

4. Deploy to your container orchestration platform (Kubernetes, ECS, etc.)

## Security Notes

- The production Nginx image runs as non-root by default
- Only necessary files are copied to the final image
- Static assets are served with appropriate caching headers
- No source code is included in the production image

## Performance Optimizations

The production build includes:

- Multi-stage build to minimize image size
- Nginx serving static files efficiently
- Aggressive caching for static assets
- Gzip compression enabled
- Production Angular build optimizations

## Support

For issues related to:
- Angular configuration: See main README.md
- Docker setup: Check this file
- Firebase integration: See Firebase documentation
