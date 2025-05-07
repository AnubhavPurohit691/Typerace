FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml turbo.json ./

COPY ./apps/ws-backend/package.json ./apps/ws-backend/package.json

COPY . .

RUN npm install -g pnpm

RUN pnpm install 

RUN pnpm build:ws

WORKDIR /app/apps/ws-backend

EXPOSE 8080

CMD [ "pnpm","start" ]