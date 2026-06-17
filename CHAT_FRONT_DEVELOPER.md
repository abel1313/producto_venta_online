# Chat en Vivo — Guía de integración para el Front (Angular)

> Documento técnico para el desarrollador frontend.
> Describe exactamente qué expone el backend, los payloads de cada mensaje y cómo conectarlo.

---

## Contexto del servidor

- **URL base:** `http://localhost:9091/mis-productos` (dev) / `https://qa.shop.novedades-jade.com.mx/mis-productos` (QA)
- **Protocolo chat:** WebSocket STOMP sobre SockJS
- **Auth en chat:** el widget del visitante NO necesita JWT. El panel del admin SÍ necesita JWT en los headers del STOMP.

---

## Paso 0 — Instalar dependencias

```bash
npm install @stomp/stompjs sockjs-client
npm install --save-dev @types/sockjs-client
```

---

## Paso 1 — Conectar el WebSocket

```typescript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:9091/mis-productos/ws'),
  reconnectDelay: 5000,
  onConnect: () => {
    // aquí van todas las suscripciones
  }
});

client.activate();
```

> En QA: `https://qa.shop.novedades-jade.com.mx/mis-productos/ws`

---

## PARTE 1 — Widget del visitante

### Flujo de conexión inicial (una sola vez al abrir el widget)

```
1. Usuario abre el widget
2. Conectar WebSocket (client.activate())
3. Generar un tempId local: crypto.randomUUID()
4. Suscribirse a /topic/chat.inicio.{tempId}
5. Enviar a /app/chat.conectar
6. Backend responde con { sesionId }
7. Guardar sesionId en variable del componente (NO localStorage)
8. Suscribirse a /topic/chat.usuario.{sesionId}
9. Cancelar suscripción a /topic/chat.inicio.{tempId}
```

### Código de conexión

```typescript
const tempId = crypto.randomUUID();

onConnect: () => {
  // 4. Escuchar respuesta de conexión
  const subInicio = client.subscribe(`/topic/chat.inicio.${tempId}`, (frame) => {
    const response = JSON.parse(frame.body);
    this.sesionId = response.sesionId;             // { sesionId: "uuid" }

    // 8. Suscribirse al canal propio
    client.subscribe(`/topic/chat.usuario.${this.sesionId}`, (msg) => {
      const evento = JSON.parse(msg.body);
      if (evento.tipo === 'SESION_CERRADA') {
        this.mostrarAvisoSesionCerrada();
      } else {
        this.agregarMensaje(evento);               // tipo: MENSAJE
      }
    });

    // 9. Ya no necesitamos el canal temporal
    subInicio.unsubscribe();
  });

  // 5. Solicitar conexión
  client.publish({
    destination: '/app/chat.conectar',
    body: JSON.stringify({
      tempId: tempId,
      nombreUsuario: 'Visitante'    // o el nombre del cliente logueado
    })
  });
}
```

### Enviar un mensaje

```typescript
client.publish({
  destination: '/app/chat.mensaje',
  body: JSON.stringify({
    sesionId: this.sesionId,
    contenido: 'Hola, ¿me pueden ayudar?'
  })
});
```

### Mensajes que llegan al widget (canal `/topic/chat.usuario.{sesionId}`)

```typescript
interface EventoUsuario {
  tipo: 'MENSAJE' | 'SESION_CERRADA';
  remitente: 'ADMIN';          // solo presente cuando tipo = MENSAJE
  contenido: string;           // solo presente cuando tipo = MENSAJE
  timestamp: string;           // "2026-06-16T14:30:00" — solo cuando tipo = MENSAJE
}
```

**Ejemplo MENSAJE:**
```json
{
  "tipo": "MENSAJE",
  "remitente": "ADMIN",
  "contenido": "Hola, con gusto le ayudo",
  "timestamp": "2026-06-16T14:30:00"
}
```

**Ejemplo SESION_CERRADA:**
```json
{
  "tipo": "SESION_CERRADA"
}
```

### Reconexión automática

Si la pestaña pierde la conexión, `@stomp/stompjs` reconecta automáticamente cada 5 segundos (`reconnectDelay: 5000`). Al reconectar se vuelve a disparar `onConnect`. **Importante:** si el `sesionId` aún está en memoria, hay que re-suscribirse a `/topic/chat.usuario.{sesionId}` en el `onConnect`.

---

## PARTE 2 — Panel del Administrador

### Ruta Angular sugerida

```
/admin/chat   (protegida con guardia de rol ADMIN)
```

### Flujo al entrar al panel

```
1. Conectar WebSocket con header Authorization
2. Suscribirse a /topic/chat.admin
3. Enviar /app/chat.admin.conectado  ← suspende emails al admin
4. Cargar sesiones activas: GET /v1/chat/admin/sesiones
```

### Código de conexión (admin)

```typescript
const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:9091/mis-productos/ws'),
  connectHeaders: {
    Authorization: `Bearer ${this.authService.getToken()}`
  },
  reconnectDelay: 5000,
  onConnect: () => {

    // Suscribirse a todos los mensajes de usuarios
    client.subscribe('/topic/chat.admin', (frame) => {
      const evento: EventoAdmin = JSON.parse(frame.body);
      if (evento.tipo === 'NUEVA_SESION') {
        this.agregarSesion(evento);
      } else if (evento.tipo === 'MENSAJE') {
        this.agregarMensajeEnSesion(evento.sesionId, evento);
        this.incrementarBadge(evento.sesionId);
      }
    });

    // Avisar al back que el admin está conectado (suspende emails)
    client.publish({ destination: '/app/chat.admin.conectado', body: '{}' });

    // Cargar sesiones activas por REST
    this.cargarSesiones();
  }
});
client.activate();
```

### Mensajes que llegan al panel (canal `/topic/chat.admin`)

```typescript
interface EventoAdmin {
  tipo: 'NUEVA_SESION' | 'MENSAJE';
  sesionId: string;
  nombreUsuario: string;
  contenido?: string;    // solo en tipo MENSAJE
  timestamp?: string;    // "2026-06-16T14:30:00" — solo en tipo MENSAJE
}
```

**Ejemplo NUEVA_SESION:**
```json
{
  "tipo": "NUEVA_SESION",
  "sesionId": "550e8400-e29b-41d4-a716-446655440000",
  "nombreUsuario": "María González"
}
```

**Ejemplo MENSAJE:**
```json
{
  "tipo": "MENSAJE",
  "sesionId": "550e8400-e29b-41d4-a716-446655440000",
  "nombreUsuario": "María González",
  "contenido": "¿Tienen la bolsa negra en talla grande?",
  "timestamp": "2026-06-16T14:31:05"
}
```

### Responder a un usuario

```typescript
client.publish({
  destination: '/app/chat.admin.responder',
  body: JSON.stringify({
    sesionId: this.sesionSeleccionada,
    contenido: 'Hola, con gusto le ayudo'
  })
});
```

---

## Endpoints REST del panel admin

Todos requieren `Authorization: Bearer {token}` en el header.
Base: `http://localhost:9091/mis-productos`

### GET `/v1/chat/admin/sesiones`

Carga la lista inicial de sesiones activas.

**Response 200:**
```json
{
  "code": 200,
  "mensaje": "La peticion fue exitosa",
  "data": [
    {
      "sesionId": "550e8400-e29b-41d4-a716-446655440000",
      "nombreUsuario": "María González",
      "fechaInicio": "2026-06-16T14:00:00",
      "ultimaActividad": "2026-06-16T14:31:00",
      "ultimoMensaje": "¿Tienen la bolsa negra en talla grande?"
    }
  ]
}
```

### GET `/v1/chat/admin/historial/{sesionId}`

Carga el historial completo al hacer clic en una sesión.

**Response 200:**
```json
{
  "code": 200,
  "mensaje": "La peticion fue exitosa",
  "data": [
    {
      "remitente": "USUARIO",
      "contenido": "Hola, ¿me pueden ayudar?",
      "timestamp": "2026-06-16T14:00:05"
    },
    {
      "remitente": "ADMIN",
      "contenido": "Hola, con gusto",
      "timestamp": "2026-06-16T14:00:30"
    }
  ]
}
```

### POST `/v1/chat/admin/cerrar/{sesionId}`

Cierra manualmente una sesión (sin body).

**Response 204** — sin body.

El backend también enviará automáticamente `{ tipo: "SESION_CERRADA" }` al widget del usuario.

---

## Resumen de canales WebSocket

| Canal | Dirección | Quién lo usa | Para qué |
|---|---|---|---|
| `/app/chat.conectar` | Front → Back | Widget visitante | Crear sesión |
| `/topic/chat.inicio.{tempId}` | Back → Front | Widget visitante | Recibir `sesionId` |
| `/app/chat.mensaje` | Front → Back | Widget visitante | Enviar mensaje |
| `/topic/chat.usuario.{sesionId}` | Back → Front | Widget visitante | Recibir respuesta del admin |
| `/app/chat.admin.conectado` | Front → Back | Panel admin | Avisar que el admin está activo |
| `/topic/chat.admin` | Back → Front | Panel admin | Recibir todos los mensajes y nuevas sesiones |
| `/app/chat.admin.responder` | Front → Back | Panel admin | Responder a un usuario |

---

## Notas importantes

1. **El `sesionId` NO va en localStorage** — solo en una variable del componente. Si el usuario cierra y reabre el navegador, se crea una sesión nueva.
2. **El widget NO requiere JWT.** La conexión WebSocket es pública.
3. **El panel del admin SÍ requiere JWT** — pásalo en `connectHeaders` al crear el cliente STOMP.
4. **El badge de no leídos** se maneja 100% en el front — el back no lo persiste. Incrementa al recibir `MENSAJE` en `/topic/chat.admin` y resetea a 0 al hacer clic en la sesión.
5. **Si el admin cierra el panel**, idealmente envía un mensaje de desconexión. Como alternativa, el back detectará que el admin no está conectado en el próximo mensaje y reanudará los emails. Para implementar esto en el front, llama a `client.deactivate()` al destruir el componente del panel.
6. **Cierre por inactividad:** el scheduler del back cierra sesiones con más de 30 minutos sin actividad y envía `SESION_CERRADA` al widget. El widget debe mostrar un aviso al usuario.
7. **Timestamp format:** todos los timestamps vienen en formato `"yyyy-MM-dd'T'HH:mm:ss"` (ISO 8601 sin zona horaria). Para mostrarlos usa `new Date(timestamp)` o Intl.DateTimeFormat.

---

## Modelo de datos TypeScript completo

```typescript
// Payloads que envía el front al back
interface ChatConectarRequest {
  tempId: string;         // UUID generado localmente
  nombreUsuario: string;  // "Visitante" si anónimo
}

interface ChatMensajeRequest {
  sesionId: string;
  contenido: string;
}

interface ChatAdminResponderRequest {
  sesionId: string;
  contenido: string;
}

// Payloads que llegan desde el back
interface ChatConexionResponse {
  sesionId: string;
}

interface EventoUsuario {
  tipo: 'MENSAJE' | 'SESION_CERRADA';
  remitente?: 'ADMIN';
  contenido?: string;
  timestamp?: string;
}

interface EventoAdmin {
  tipo: 'NUEVA_SESION' | 'MENSAJE';
  sesionId: string;
  nombreUsuario: string;
  contenido?: string;
  timestamp?: string;
}

// REST responses
interface SesionActiva {
  sesionId: string;
  nombreUsuario: string;
  fechaInicio: string;
  ultimaActividad: string;
  ultimoMensaje: string | null;
}

interface MensajeHistorial {
  remitente: 'USUARIO' | 'ADMIN';
  contenido: string;
  timestamp: string;
}

interface ApiResponse<T> {
  code: number;
  mensaje: string;
  data: T;
}
```

---

---

## Indicador de conexión estilo YouTube

El widget debe mostrar banners igual que YouTube:
- **Amarillo** con spinner → "Reconectando..."
- **Rojo** → "Sin conexión a internet"
- **Verde** (3 seg y desaparece) → "Conexión restaurada"

### 1. Tipo de estado

```typescript
type EstadoConexion = 'conectado' | 'reconectando' | 'sin-internet' | 'restaurado';
```

### 2. En el servicio `chat.service.ts`

```typescript
import { signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export class ChatService {

  estadoConexion = signal<EstadoConexion>('conectado');

  private client!: Client;
  private timeoutRestaurado: any;

  conectar() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:9091/mis-productos/ws'),
      reconnectDelay: 15000,

      onConnect: () => {
        this.estadoConexion.set('restaurado');
        clearTimeout(this.timeoutRestaurado);
        // Vuelve a "conectado" (banner verde se oculta) tras 3 segundos
        this.timeoutRestaurado = setTimeout(() => {
          this.estadoConexion.set('conectado');
        }, 3000);

        // aquí van las suscripciones STOMP...
      },

      onWebSocketClose: () => {
        this.estadoConexion.set('reconectando');
      },

      onWebSocketError: () => {
        this.estadoConexion.set('reconectando');
      }
    });

    // Eventos del navegador (cuando el dispositivo pierde/recupera red)
    window.addEventListener('offline', () => {
      this.estadoConexion.set('sin-internet');
    });

    window.addEventListener('online', () => {
      this.estadoConexion.set('reconectando');
      // La librería intentará reconectar sola, onConnect actualizará a 'restaurado'
    });

    this.client.activate();
  }
}
```

### 3. HTML del widget `chat-widget.component.html`

```html
<!-- Banner de conexión (solo visible cuando NO está conectado) -->
@if (chatService.estadoConexion() !== 'conectado') {
  <div class="conexion-banner" [ngClass]="chatService.estadoConexion()">

    @switch (chatService.estadoConexion()) {
      @case ('reconectando') {
        <span class="spinner"></span>
        <span>Reconectando...</span>
      }
      @case ('sin-internet') {
        <span>Sin conexión a internet</span>
      }
      @case ('restaurado') {
        <span>✓ Conexión restaurada</span>
      }
    }

  </div>
}

<!-- El resto del widget abajo -->
<button class="chat-bubble" (click)="toggleChat()">💬</button>
<!-- ... -->
```

### 4. Estilos `chat-widget.component.scss`

```scss
.conexion-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  animation: slideDown 0.3s ease;

  &.reconectando {
    background: #f9a825;
    color: #333;
  }

  &.sin-internet {
    background: #d32f2f;
    color: #fff;
  }

  &.restaurado {
    background: #388e3c;
    color: #fff;
  }
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 5. Flujo visual resumido

```
[Usuario sin señal]
  → banner ROJO: "Sin conexión a internet"

[Señal vuelve — librería intenta reconectar]
  → banner AMARILLO + spinner: "Reconectando..."

[Reconexión exitosa (onConnect)]
  → banner VERDE: "✓ Conexión restaurada"
  → 3 segundos después → banner desaparece

[Estado normal]
  → sin banner visible (igual que YouTube)
```

### 6. Bloquear el botón Enviar sin conexión

```typescript
enviar() {
  if (this.chatService.estadoConexion() !== 'conectado') {
    // opcional: vibrar el input para que el usuario note que no puede enviar
    return;
  }
  this.chatService.enviarMensaje(this.texto);
  this.texto = '';
}
```

```html
<button
  (click)="enviar()"
  [disabled]="chatService.estadoConexion() !== 'conectado'"
  [title]="chatService.estadoConexion() === 'reconectando' ? 'Reconectando...' : ''">
  Enviar
</button>
```

---

## Pendiente / Preguntas para el equipo

1. **¿El visitante puede ser un cliente registrado?** Si tiene JWT, se puede pasar el nombre real en `nombreUsuario`. Si es anónimo, usar "Visitante".
2. **¿El email del admin?** Configurar en la variable de entorno `CHAT_ADMIN_EMAIL` en el servidor. Por defecto: `admin@novedades-jade.com.mx`.
3. **¿El panel admin va en el Angular existente como `/admin/chat`?** Sí, es la recomendación actual.
