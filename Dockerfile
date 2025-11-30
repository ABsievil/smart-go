# Multi-stage Dockerfile for NestJS (build + production)

FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only (use yarn; avoid mixing managers)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN yarn build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean || true

# Copy compiled app
COPY --from=builder /app/dist ./dist
# Copy languages directory (if not already in dist)
COPY --from=builder /app/src/languages ./dist/languages

# Expose app port
EXPOSE 8000

CMD ["node", "dist/main.js"]

