# Git Flow — producto_venta_online

## Jerarquía de ramas

```
master  ← producción (nunca se toca directamente)
  └── qa  ← staging / pruebas
        └── dev  ← desarrollo diario
```

Los cambios **siempre suben**: `dev → qa → master`  
Los cambios **bajan** cuando hay fixes en ramas superiores: `master → qa → dev`

---

## Flujo 1 — Subir cambios de dev a qa (el más frecuente)

```bash
# 1. Asegúrate de estar en dev y tener todo commiteado
git checkout dev
git add .
git commit -m "descripción del cambio"
git push origin dev

# 2. Pasarte a qa y traer lo que tiene qa (por si alguien más hizo cambios)
git checkout qa
git pull origin qa

# 3. Traer los cambios de dev a qa
git merge dev

# 4. Resolver conflictos si los hay, luego:
git push origin qa
```

---

## Flujo 2 — Subir cambios de qa a master (cuando ya está probado)

```bash
# 1. Asegúrate de que qa esté actualizado y probado
git checkout qa
git pull origin qa

# 2. Pasarte a master y traer lo que tiene
git checkout master
git pull origin master

# 3. Traer los cambios de qa a master
git merge qa

# 4. Push a master
git push origin master
```

---

## Flujo 3 — Bajar cambios de master a qa (hotfix o cambio urgente en master)

```bash
git checkout qa
git pull origin qa
git merge master
git push origin qa
```

---

## Flujo 4 — Bajar cambios de qa a dev (para que dev tenga lo último)

```bash
git checkout dev
git pull origin dev
git merge qa
git push origin dev
```

---

## Flujo completo — dev → qa → master (subida completa)

```bash
# Paso 1: commit en dev
git checkout dev
git add .
git commit -m "feat: descripción"
git push origin dev

# Paso 2: dev → qa
git checkout qa
git pull origin qa
git merge dev
git push origin qa

# Paso 3: qa → master (solo cuando esté probado y listo para prod)
git checkout master
git pull origin master
git merge qa
git push origin master

# Paso 4: bajar master a qa y dev para que estén sincronizados
git checkout qa
git merge master
git push origin qa

git checkout dev
git merge qa
git push origin dev
```

---

## Reglas importantes

| Regla | Por qué |
|---|---|
| **Nunca commitear directo en master** | master = producción, solo llega vía qa |
| **Nunca commitear directo en qa** | qa solo recibe merges de dev (o de master si hay hotfix) |
| **Siempre hacer `git pull` antes de un merge** | Evita conflictos por cambios de otros |
| **Resolver conflictos en la rama destino** | Si hay conflicto al mergear dev→qa, resolverlo en qa |
| **No mezclar ramas** | No hagas merge de dev directo a master saltándote qa |

---

## Comandos de ayuda frecuentes

```bash
# Ver en qué rama estás
git branch

# Ver estado de archivos modificados
git status

# Ver diferencias entre ramas antes de mergear
git log qa..dev --oneline          # commits en dev que no están en qa
git log master..qa --oneline       # commits en qa que no están en master

# Si un merge salió mal y quieres deshacerlo
git merge --abort                  # solo funciona DURANTE el merge con conflictos

# Ver el historial visual de ramas
git log --oneline --graph --all
```

---

## Estado actual del proyecto (2026-05-22)

- **Rama de trabajo diario:** `dev`
- **Rama de pruebas:** `qa`
- **Rama de producción:** `master`
- **Cambios pendientes de subir:** los realizados en esta sesión (imágenes, carrusel variante, compartir)
- **Nota:** master tiene 5 commits con la feature de cámara que no están en qa/dev — al subir, hacer `master → qa → dev` primero para sincronizar

---

## Flujo para subir los cambios de esta sesión

```bash
# 1. Commiteamos todo en dev (si no está ya commiteado)
git checkout dev
git add .
git commit -m "feat: carrusel variante update, fix imagenSrc pipe blob, compartir buscar variantes"
git push origin dev

# 2. Subir a qa
git checkout qa
git pull origin qa
git merge dev
git push origin qa

# 3. (Cuando esté listo para prod) Subir a master
git checkout master
git pull origin master
git merge qa
git push origin master
```
