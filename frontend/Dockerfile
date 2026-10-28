FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

# Self-signed cert so the Vite dev server can serve the app over HTTPS.
RUN mkdir -p certs && openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout certs/key.pem -out certs/cert.pem -days 825 \
    -subj "/CN=vcf-lic-mgmt"

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
