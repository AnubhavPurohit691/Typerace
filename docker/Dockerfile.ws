FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./

COPY ./apps/backend ./apps/backend

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build

EXPOSE 8080

CMD [ "pnpm","start" ]