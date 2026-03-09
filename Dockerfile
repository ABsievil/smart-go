FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN yarn build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./

# Bỏ || true để lộ lỗi nếu install thất bại
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy compiled app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/languages ./dist/languages

EXPOSE 8000

CMD ["node", "dist/main.js"]