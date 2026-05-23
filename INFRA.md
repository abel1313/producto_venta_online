# Infraestructura — novedades-jade.com.mx

> Documento de referencia para entender cómo está montada la infraestructura,
> cómo se conecta el frontend con los backends, y cómo hacer deploys.
> Actualizar este archivo cada vez que cambie una URL, puerto o dominio.

---

## Arquitectura general

```
Usuario (browser)
       │
       ▼
   Nginx (VPS)  ←── HTTPS con Certbot / Let's Encrypt
       │
       ├── PRODUCCIÓN
       │   ├── backend.novedades-jade.com.mx          → NodePort 30010 → proyecto-key
       │   ├── backend-imagenes.novedades-jade.com.mx → NodePort 30096 → micro-imagenes
       │   └── shop.novedades-jade.com.mx             → NodePort 30001 → Angular
       │
       └── QA
           ├── qa.backend.novedades-jade.com.mx          → NodePort 31010 → proyecto-key (QA)
           ├── qa.backend-imagenes.novedades-jade.com.mx → NodePort 31096 → micro-imagenes (QA)
           └── qa.shop.novedades-jade.com.mx             → NodePort 31001 → Angular (QA)
```

Hay **dos namespaces en K8s**: uno para **producción** y otro para **QA**.
Nginx actúa como reverse proxy y termina SSL antes de llegar a K8s.
Los puertos de prod empiezan en 3**0**xxx y los de QA en 3**1**xxx.

---

## Ambientes

### PRODUCCIÓN

| Servicio | Dominio público | NodePort K8s | Puerto interno |
|---|---|---|---|
| Backend (proyecto-key) | `backend.novedades-jade.com.mx` | 30010 | 9091 |
| Micro imágenes | `backend-imagenes.novedades-jade.com.mx` | 30096 | 9096 |
| Frontend Angular | `shop.novedades-jade.com.mx` | 30001 | — |

**Context path de todos los servicios:** `/mis-productos`

**URLs completas que usa el frontend:**
```
api_Url      = https://backend.novedades-jade.com.mx/mis-productos
api_imagenes = https://backend-imagenes.novedades-jade.com.mx/mis-productos
```

---

### QA

| Servicio | Dominio público | NodePort K8s | Puerto interno |
|---|---|---|---|
| Backend (proyecto-key) | `qa.backend.novedades-jade.com.mx` | **31010** | 9091 |
| Micro imágenes | `qa.backend-imagenes.novedades-jade.com.mx` | **31096** | 9096 |
| Frontend Angular | `qa.shop.novedades-jade.com.mx` | **31001** | — |

**URLs completas que usa el frontend en QA:**
```
api_Url      = https://qa.backend.novedades-jade.com.mx/mis-productos
api_imagenes = https://qa.backend-imagenes.novedades-jade.com.mx/mis-productos
```

**Diferencia con prod:** los NodePorts son 31xxx en QA vs 30xxx en prod.
El Nginx de QA está en `/etc/nginx/sites-enabled/backend-qa` y `/etc/nginx/sites-enabled/imagenes-qa` (o similares).

---

### LOCAL (desarrollo)

| Servicio | URL | Puerto |
|---|---|---|
| Backend (proyecto-key) | `http://localhost:9091/mis-productos` | 9091 |
| Micro imágenes | `http://localhost:9096/mis-productos` | 9096 |
| Frontend Angular | `http://localhost:4200` | 4200 |

---

## Archivos de ambiente Angular

Están en `src/environments/`. Angular los intercambia automáticamente al compilar.

| Archivo | Build Angular | Para qué sirve |
|---|---|---|
| `environment.ts` | `development` (default) | Desarrollo local con `ng serve` |
| `environment.prod.ts` | `production` | Deploy a producción |
| `environment.qa.ts` | `qa` | Deploy a QA |
| `environment.docker.ts` | `docker` | Build para Docker |

### environment.ts (local)
```typescript
export const environment = {
  production: false,
  api_Url:      'http://localhost:9091/mis-productos',
  api_imagenes: 'http://localhost:9096/mis-productos'
};
```

### environment.prod.ts ✅
```typescript
export const environment = {
  production: true,
  api_Url:      'https://backend.novedades-jade.com.mx/mis-productos',
  api_imagenes: 'https://backend-imagenes.novedades-jade.com.mx/mis-productos'
};
```

### environment.qa.ts ✅
```typescript
export const environment = {
  production: false,
  api_Url:      'https://qa.backend.novedades-jade.com.mx/mis-productos',
  api_imagenes: 'https://qa.backend-imagenes.novedades-jade.com.mx/mis-productos'
};
```

---

## IMPORTANTE — Cómo funcionan los ambientes en Angular

> Angular **quema** las URLs de `environment.*.ts` dentro del bundle JS al compilar.
> El frontend **NO** lee variables de entorno en runtime.
> Cambiar un environment file requiere recompilar y redesplegar.

```
environment.qa.ts   →   ng build --configuration=qa   →   bundle.js con URLs de QA
environment.prod.ts →   ng build --configuration=prod →   bundle.js con URLs de prod
```

**Por eso `qa.shop.novedades-jade.com.mx` hacía peticiones a `localhost:30096`:**
La imagen Docker del frontend de QA fue construida sin `--build-arg BUILD_CONFIGURATION=qa`,
por lo que usó el default `production` con el archivo `environment.prod.ts` que antes
tenía `localhost:30096`. La solución es reconstruir la imagen con el argumento correcto.

---

## Docker — cómo construir la imagen del frontend

El `Dockerfile` acepta `BUILD_CONFIGURATION` como argumento de build:

```dockerfile
FROM node:20 AS build
ARG BUILD_CONFIGURATION=production          # default: production
RUN npx ng build --configuration=${BUILD_CONFIGURATION}

FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html
```

### Build para PRODUCCIÓN
```bash
# Usa environment.prod.ts (BUILD_CONFIGURATION=production es el default)
docker build -t frontend-prod:latest .

# Con tag específico
docker build -t <tu-registry>/frontend:prod-v1.0 .
```

### Build para QA
```bash
# Usa environment.qa.ts
docker build --build-arg BUILD_CONFIGURATION=qa -t frontend-qa:latest .

# Con tag específico
docker build --build-arg BUILD_CONFIGURATION=qa -t <tu-registry>/frontend:qa-v1.0 .
```

### Push al registry (si usas uno)
```bash
docker push <tu-registry>/frontend:prod-v1.0
docker push <tu-registry>/frontend:qa-v1.0
```

---

## K8s — cómo se usa la imagen en el deployment

En los YAMLs de K8s el deployment del frontend solo especifica qué imagen usar.
El ambiente ya viene quemado en la imagen desde el build de Docker.

### Deployment de producción (namespace prod)
```yaml
# deployment-frontend-prod.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: prod     # ← namespace de producción
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: frontend
        image: <tu-registry>/frontend:prod-v1.0   # ← imagen con environment.prod.ts
        ports:
        - containerPort: 80
```

### Deployment de QA (namespace qa)
```yaml
# deployment-frontend-qa.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: qa       # ← namespace de QA
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: frontend
        image: <tu-registry>/frontend:qa-v1.0     # ← imagen con environment.qa.ts
        ports:
        - containerPort: 80
```

### Service con NodePort (igual para prod y qa, distinto puerto)
```yaml
# service-frontend.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
  - port: 80
    nodePort: 30001   # prod: 30001 | qa: 31001
```

---

## GitHub Actions — flujo automático de deploy

El proyecto usa **dos workflows** en `.github/workflows/`:

| Archivo | Se dispara | Ambiente | Namespace K8s |
|---|---|---|---|
| `proyecto-front-actions.yml` | push a `master` | `production` | `default` |
| `producto-actions-qa.yml` | push a `qa` | `qa` | `qa` |

### Flujo QA (push a rama `qa`)
```
1. GitHub Actions detecta push a rama 'qa'
2. Buildea imagen Docker:
      docker build --build-arg BUILD_CONFIGURATION=qa
      → ng build --configuration=qa
      → usa environment.qa.ts  ← URLs de QA quemadas en el JS
3. Push a Docker Hub: abel1313/front-jade-service:qa
4. SSH al VPS → kubectl rollout restart deployment ... -n qa
5. K8s descarga imagen :qa del Hub y reinicia pods
6. qa.shop.novedades-jade.com.mx sirve el nuevo build
```

### Flujo PRODUCCIÓN (push a rama `master`)
```
1. GitHub Actions detecta push a rama 'master'
2. Buildea imagen Docker:
      docker build  (sin --build-arg → default: production)
      → ng build --configuration=production
      → usa environment.prod.ts  ← URLs de prod quemadas en el JS
3. Push a Docker Hub: abel1313/front-jade-service:latest y :vN
4. SSH al VPS → kubectl rollout restart deployment ... -n default
5. K8s descarga imagen :latest del Hub y reinicia pods
6. shop.novedades-jade.com.mx sirve el nuevo build
```

### Por qué QA hacía peticiones a localhost:30096
`environment.qa.ts` tenía `api_imagenes: 'http://localhost:30096/mis-productos'`.
Aunque el workflow SÍ pasaba `BUILD_CONFIGURATION=qa`, el archivo de ambiente tenía la URL incorrecta.
**Fix aplicado:** `environment.qa.ts` y `environment.prod.ts` ya tienen las URLs correctas.
El próximo push a `qa` desplegará con las URLs correctas automáticamente.

### Para forzar un redeploy sin cambiar código
```bash
# En la VPS — reiniciar el pod de QA manualmente
sudo kubectl rollout restart deployment proyecto-key-front-deployment -n qa

# Reiniciar prod
sudo kubectl rollout restart deployment proyecto-key-front-deployment -n default
```

---

## Cómo compilar el frontend (sin Docker)

```bash
# Desarrollo local
ng serve

# Build para producción → usa environment.prod.ts
ng build --configuration=production

# Build para QA → usa environment.qa.ts
ng build --configuration=qa

# Build para Docker → usa environment.docker.ts
ng build --configuration=docker
```

---

## Nginx — configuración completa

### Resumen de todos los bloques activos

| Dominio | NodePort | Archivo Nginx |
|---|---|---|
| `backend.novedades-jade.com.mx` | 30010 | `sites-available/` (prod) |
| `backend-imagenes.novedades-jade.com.mx` | 30096 | `sites-available/` (prod) |
| `shop.novedades-jade.com.mx` | 30001 | `sites-enabled/frontend` |
| `qa.backend.novedades-jade.com.mx` | 31010 | `sites-enabled/backend-qa` |
| `qa.backend-imagenes.novedades-jade.com.mx` | 31096 | `sites-enabled/imagenes-qa` (o similar) |
| `qa.shop.novedades-jade.com.mx` | 31001 | `sites-enabled/` (QA) |

---

## Nginx — PRODUCCIÓN

El archivo está en `/etc/nginx/sites-available/` en la VPS.

### backend.novedades-jade.com.mx → proyecto-key
```nginx
server {
    server_name backend.novedades-jade.com.mx;

    location /mis-productos/ {
        proxy_pass http://51.178.29.99:30010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/backend.novedades-jade.com.mx/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend.novedades-jade.com.mx/privkey.pem;
}
```

> **Nota:** `location /mis-productos/` → el path `/mis-productos` se pasa tal cual al backend.
> El proxy apunta a IP interna `51.178.29.99:30010` (NodePort del nodo K8s).

### backend-imagenes.novedades-jade.com.mx → micro-imagenes
```nginx
server {
    server_name backend-imagenes.novedades-jade.com.mx;
    client_max_body_size 40m;   ← importante para subir imágenes grandes

    location / {
        proxy_pass http://127.0.0.1:30096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/backend-imagenes.novedades-jade.com.mx/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend-imagenes.novedades-jade.com.mx/privkey.pem;
}
```

> **Nota:** `location /` → pasa el path completo. Como el micro corre con contexto `/mis-productos`,
> la URL completa es `https://backend-imagenes.novedades-jade.com.mx/mis-productos/...`

### shop.novedades-jade.com.mx → frontend Angular
```nginx
server {
    server_name shop.novedades-jade.com.mx;

    location / {
        proxy_pass http://127.0.0.1:30001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/shop.novedades-jade.com.mx/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.novedades-jade.com.mx/privkey.pem;
}
```

---

## Nginx — QA

### qa.backend.novedades-jade.com.mx → proyecto-key (QA)
```nginx
server {
    server_name qa.backend.novedades-jade.com.mx;

    location / {
        proxy_pass http://127.0.0.1:31010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/qa.shop.novedades-jade.com.mx/fullchain.pem;
}
```

> **Nota:** usa `location /` (distinto a prod que usa `location /mis-productos/`).
> El cert SSL es compartido con `qa.shop.novedades-jade.com.mx`.

### qa.backend-imagenes.novedades-jade.com.mx → micro-imagenes (QA)
```nginx
server {
    server_name qa.backend-imagenes.novedades-jade.com.mx;
    client_max_body_size 40m;

    location / {
        proxy_pass http://127.0.0.1:31096;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/qa.shop.novedades-jade.com.mx/fullchain.pem;
}
```

### qa.shop.novedades-jade.com.mx → Angular (QA)
```nginx
server {
    server_name qa.shop.novedades-jade.com.mx;

    location / {
        proxy_pass http://127.0.0.1:31001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/qa.shop.novedades-jade.com.mx/fullchain.pem;
}
```

---

## Kubernetes — comandos útiles

```bash
# Ver todos los servicios y sus NodePorts (en qué puerto está expuesto cada micro)
kubectl get svc -A

# Ver pods corriendo y su estado
kubectl get pods -A

# Ver en qué namespace están los pods
kubectl get pods -n <namespace>

# IP pública del nodo (la que usa Nginx para el proxy_pass)
kubectl get nodes -o wide

# Ver los namespaces disponibles (producción y QA deberían estar aquí)
kubectl get namespaces

# Ver qué hay en el namespace de QA
kubectl get all -n <namespace-qa>

# Logs de un pod específico
kubectl logs -n <namespace> <nombre-pod> --tail=100 -f

# Reiniciar un deployment (para que tome nuevas variables de entorno)
kubectl rollout restart deployment/<nombre> -n <namespace>

# Ver los NodePorts de un namespace específico
kubectl get svc -n <namespace>
```

---

## Cómo agregar un nuevo micro al sistema

### 1. K8s — exponer el servicio como NodePort
```yaml
apiVersion: v1
kind: Service
spec:
  type: NodePort
  ports:
    - port: 9097          # puerto interno del micro
      nodePort: 30097     # puerto expuesto en el nodo (30000-32767)
```

### 2. Nginx — agregar bloque en la VPS
```nginx
server {
    server_name nuevo-micro.novedades-jade.com.mx;
    client_max_body_size 40m;

    location / {
        proxy_pass http://127.0.0.1:30097;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
    server_name nuevo-micro.novedades-jade.com.mx;
}
```

### 3. SSL con Certbot
```bash
sudo certbot --nginx -d nuevo-micro.novedades-jade.com.mx
```

### 4. Recargar Nginx
```bash
sudo nginx -t                    # verificar que no hay errores de sintaxis
sudo systemctl reload nginx      # aplicar cambios sin cortar conexiones
```

### 5. Actualizar el frontend
Agregar la nueva URL en los archivos de ambiente de Angular:
```typescript
// environment.prod.ts
export const environment = {
  ...
  api_nuevo_micro: 'https://nuevo-micro.novedades-jade.com.mx/mis-productos'
};
```

---

## Error frecuente — imágenes con localhost en producción

**Síntoma:** el frontend en producción hace peticiones a `http://localhost:30096/...`
en lugar de la URL real del micro de imágenes.

**Causa:** el archivo `environment.prod.ts` (o `environment.qa.ts`) tenía
`api_imagenes: 'http://localhost:30096/mis-productos'`.

`localhost` hace referencia a la máquina del **usuario en su browser**,
no al servidor VPS. Por eso funciona en local pero no en producción.

**Fix aplicado (2026-05-22):**
```typescript
// environment.prod.ts
api_imagenes: 'https://backend-imagenes.novedades-jade.com.mx/mis-productos'

// environment.qa.ts
api_imagenes: 'https://qa.backend-imagenes.novedades-jade.com.mx/mis-productos'
```

---

## Flujo completo de una petición de imagen en producción

```
1. Browser pide la página  →  https://shop.novedades-jade.com.mx
2. Nginx recibe en 443     →  proxy a NodePort 30001  →  Angular
3. Angular carga, hace petición a obtenerProductos
4. Angular  →  https://backend.novedades-jade.com.mx/mis-productos/productos/obtenerProductos
5. Nginx    →  NodePort 30010  →  proyecto-key
6. proyecto-key responde con lista de productos, cada uno con:
   imagen.urlImagen = "https://backend-imagenes.novedades-jade.com.mx/mis-productos/imagenes/file/{id}"
7. Angular (imagenSrc pipe) hace GET a esa URL con Bearer token
8. Nginx    →  NodePort 30096  →  micro-imagenes
9. micro-imagenes responde con los bytes de la imagen
10. imagenSrc pipe convierte bytes → data URL → <img src="data:image/jpeg;base64,...">
```

---

## Checklist para un deploy completo

- [ ] `ng build --configuration=production` sin errores
- [ ] `dist/` subido al servidor del frontend (shop.novedades-jade.com.mx)
- [ ] `backend.novedades-jade.com.mx` responde (curl o browser)
- [ ] `backend-imagenes.novedades-jade.com.mx` responde (curl o browser)
- [ ] Las imágenes se ven en el catálogo de productos
- [ ] Las imágenes se ven en el catálogo de variantes
- [ ] Login funciona
- [ ] Las imágenes de presentación (login/registro) se ven
