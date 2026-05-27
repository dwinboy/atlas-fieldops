FROM node:20-alpine
WORKDIR /app
COPY mobile/package.json mobile/package-lock.json* ./
RUN npm install
COPY mobile .
EXPOSE 8081
CMD ["npm", "run", "start", "--", "--web"]

