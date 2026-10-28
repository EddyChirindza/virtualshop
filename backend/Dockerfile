FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY migrations ./migrations
COPY src ./src
COPY server.js ./server.js
COPY seed.sql ./seed.sql

RUN mkdir -p /app/uploads/products /app/uploads/avatars \
    && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["npm", "start"]
