# A Dockerfile is the recipe for an image.
# An image is the packed app. A container is that image running.

FROM node:22-alpine

WORKDIR /app

# Install dependencies first so a code change does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the server. .dockerignore keeps out node_modules and .env.
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
