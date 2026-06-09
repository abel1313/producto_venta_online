# 🧠 Instrucciones para trabajar con la IA en este proyecto

## 1. ¿Qué puede hacer la IA?

La IA (Claude) puede:
- ✅ **Leer** cualquier archivo del proyecto
- ✅ **Editar** archivos directamente (editar, crear, reemplazar texto)
- ✅ **Ejecutar** comandos en terminal (npm, git, ng, etc.)
- ✅ Buscar archivos por patrón (glob) o contenido (grep)
- ✅ Hacer fetch de URLs (para probar endpoints)
- ✅ Ver el diff de cambios no comiteados
- ✅ Leer skills especializados (`/angular-developer`, `/code-quality`)

## 2. ¿Cómo dar instrucciones?

### ✨ Formato recomendado

```
En [módulo/componente], quiero que [acción] porque [razón/objetivo].
```

**Ejemplos:**
- *"En el navbar, cambia el color del botón de carrito a verde"*
- *"En productos/buscar, agrega un filtro por categoría"*
- *"Revisa si el TokenInterceptor maneja correctamente el refresh cuando expira"*
- *"Ejecuta `ng build --configuration production` para ver si compila"*

### 🚫 Lo que NO debes hacer (confunde a la IA)
| ❌ Mal | ✅ Bien |
|---|---|
| "Arregla lo que esté mal" | "Arregla el bug del loading que se esconde antes de tiempo en el AddComponent" |
| "Haz que se vea mejor" | "Cambia el gradiente rosa del AddComponent por variables CSS del tema" |
| "Revisa todo" | "Revisa el componente DetalleProductoComponent en busca de memory leaks" |

## 3. Flujo de trabajo típico

1. **Pides un cambio específico**
   - *"Arregla el bug del loading overlay en el interceptor"*

2. **La IA confirma y ejecuta**
   - Lee los archivos involucrados
   - Propone o aplica el cambio directamente
   - Muestra el resultado

3. **Revisas y pides ajustes**
   - *"Eso funcionó, pero ahora el spinner se queda pegado cuando hay error"*
   - *"También aplícalo a las variantes"*

## 4. Comandos útiles para la IA

Puedes pedirle que ejecute estos comandos:

| Comando | Qué hace |
|---|---|
| `Ejecuta ng serve` | Inicia servidor de desarrollo |
| `Ejecuta ng build --configuration qa` | Compila para QA |
| `Ejecuta ng test` | Corre pruebas unitarias |
| `Ejecuta git add . && git commit -m "mensaje"` | Commitea cambios |
| `Ejecuta npm install [paquete]` | Instala dependencia |
| `Haz grep de "getAll" en src/` | Busca texto en archivos |

## 5. 🧪 Cómo probar que los cambios funcionan

Después de que la IA haga cambios, puedes pedirle que verifique:

- *"Ejecuta `ng build` y dime si hay errores de compilación"*
- *"Muestra el diff de lo que cambiaste"*
- *"¿Qué archivos modificaste?"*

## 6. ⚡ Skills especializados

Para revisiones más profundas, usa:

| Skill | Cuándo usarlo |
|---|---|
| `/angular-developer` | Refactor, buenas prácticas Angular, optimización de componentes |
| `/code-quality` | Calidad de código, clean code, performance, contratos de API |

**Ejemplo:**
```
/angular-developer Revisa el UpdateComponent y dime si hay memory leaks con las suscripciones
```

## 7. ⚠️ Importante: la IA NO puede

- ❌ Acceder a servidores remotos (solo puede hacer fetch de URLs públicas)
- ❌ Recordar sesiones anteriores (cada conversación empieza de cero, aunque `CLAUDE.md` ayuda)
- ❌ Ver tu pantalla o el navegador
- ❌ Instalar cosas globales (necesita `sudo`)
- ❌ Integrarse como autocompletado en tu editor VS Code (necesitas GitHub Copilot para eso)