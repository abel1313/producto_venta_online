# Etapa 1: build con Node
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration production

# Etapa 2: servir con Nginx
FROM nginx:alpine
COPY --from=build /app/dist/producto-scaner/ /usr/share/nginx/html
