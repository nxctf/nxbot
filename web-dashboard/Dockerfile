FROM node:20-alpine

WORKDIR /app

# SQLite build dependencies on Alpine
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
