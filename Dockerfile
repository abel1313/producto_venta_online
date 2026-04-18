FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/producto-scaner/ /usr/share/nginx/html
