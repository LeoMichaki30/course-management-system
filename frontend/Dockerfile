# syntax=docker/dockerfile:1
# Build from the repository root to include the shared backend model types.
FROM node:24-alpine AS build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/src ./src
COPY frontend/tests ./tests
COPY src/models /app/src/models

# This is a public browser URL, never a Supabase credential or Docker service name.
ARG VITE_API_URL=http://localhost:3001
RUN VITE_API_URL="$VITE_API_URL" npm run build

FROM nginx:stable-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
