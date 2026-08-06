FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# ci + omit=dev: instala exactamente lo del lockfile y deja nodemon afuera
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
