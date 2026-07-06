FROM node:22-alpine

WORKDIR /app

# SQLite build dependencies on Alpine
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 7000

ENV PORT 7000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
