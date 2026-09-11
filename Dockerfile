FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Install exactly the versions in the committed lockfile before copying source.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
