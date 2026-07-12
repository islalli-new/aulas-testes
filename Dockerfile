# --- Etapa 1: build do React ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Em Docker servimos na raiz "/", então forçamos base "/" no build.
RUN npm run build -- --base=/

# --- Etapa 2: servir com nginx ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
