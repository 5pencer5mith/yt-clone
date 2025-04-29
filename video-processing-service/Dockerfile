FROM node:23

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start"]
