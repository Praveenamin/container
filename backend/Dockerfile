FROM node:18

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3337

CMD ["npm", "start"]

