FROM cgr.dev/chainguard/node:latest

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

ENTRYPOINT []

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
