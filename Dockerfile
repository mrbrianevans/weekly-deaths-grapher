# I do not know if this is correct
FROM node:12-slim

COPY . .

RUN npm ci

RUN npm run database

CMD npm ['start']
