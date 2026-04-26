FROM node:20 AS build
ARG BUILD_CONFIGURATION=production
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx ng build producto-scaner --configuration=${BUILD_CONFIGURATION}

FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html

