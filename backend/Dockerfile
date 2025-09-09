Use the official Node.js 18 image as the base image.
FROM node:18-alpine

Set the working directory inside the container.
WORKDIR /app

Copy package.json and package-lock.json to the working directory.
COPY package*.json ./

Install dependencies. The --force flag will install the dependencies without asking for confirmation.
RUN npm install --force

Copy the rest of the application source code to the working directory.
COPY . .

Expose the port on which the application will run.
EXPOSE 3337

Define the command to run the application.
CMD ["npm", "start"]
