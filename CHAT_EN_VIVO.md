# Chat en Vivo — Referencia técnica para el front

Estado actual: **2026-06-18**. Este documento tiene el estado real del backend — reemplaza el contenido anterior de planificación.

---

## Decisiones de diseño

- El chat es **exclusivo para usuarios autenticados**. No mostrar el widget si el usuario no está logueado.
- El identificador de historial es `usuarioId` (Integer del usuario en BD). No se usa `clienteId` ni localStorage.
- Las sesiones expiran por **5 minutos de inactividad** de cualquiera de los dos lados.
- Cada sesión tiene su propio `sesionId` (UUID). Al expirar se crea uno nuevo automáticamente, pero el historial se recupera siempre por `usuarioId`.

---

## Variables que el front necesita

```typescript
usuarioId: number;      // id Integer del usuario autenticado — viene del token/perfil
sesionId: string|null;  // UUID de sesión activa — viene del backend al conectar, guardar en sessionStorage
```

---

## WebSocket — conexión

**URL:**
```
wss://[host]/mis-productos/ws
```
Con SockJS: `new SockJS('/mis-productos/ws')`

Broker prefix: `/topic` | App prefix: `/app`

---

## Endpoints WebSocket

### Conectar sesión

**Suscribirse primero en:**
```
/topic/chat.inicio.{tempId}
```

**Publicar en:**
```
/app/chat.conectar
```

**Payload:**
```json
{
  "tempId": "uuid-temporal-generado-en-el-front",
  "nombreUsuario": "Juan",
  "usuarioId": 42
}
```

**Response en `/topic/chat.inicio.{tempId}`:**
```json
{ "sesionId": "94bb63c0-a3fe-4d7c-b4a9-ecd2a72c871c" }
```
→ Guardar `sesionId` en `sessionStorage`.

---

### Enviar mensaje (cliente → admin)

**Publicar en:**
```
/app/chat.mensaje
```
```json
{ "sesionId": "uuid-de-sessionStorage", "contenido": "Hola, tengo una pregunta" }
```
Si la sesión está expirada el mensaje se descarta — verificar `sesionId` antes de enviar.

---

### Recibir eventos del backend (canal del cliente)

**Suscribirse en:**
```
/topic/chat.usuario.{sesionId}
```

**Mensaje del admin:**
```json
{ "tipo": "MENSAJE", "remitente": "ADMIN", "contenido": "Hola", "timestamp": "2026-06-18T02:35:47" }
```

**Sesión expirada (5 min sin actividad):**
```json
{ "tipo": "SESION_CERRADA" }
```
→ Borrar `sesionId` de sessionStorage. Dejar mensajes visibles en pantalla. Al siguiente envío reconectar.

---

### Panel admin — recibir eventos de todos los clientes

**Suscribirse en:**
```
/topic/chat.admin
```

**Nueva sesión:**
```json
{ "tipo": "NUEVA_SESION", "sesionId": "...", "nombreUsuario": "Juan", "contenido": null, "timestamp": null }
```

**Mensaje de un cliente:**
```json
{ "tipo": "MENSAJE", "sesionId": "...", "nombreUsuario": "Juan", "contenido": "Hola", "timestamp": "2026-06-18T10:00:00" }
```

---

### Panel admin — responder a un cliente

**Publicar en:**
```
/app/chat.admin.responder
```
```json
{ "sesionId": "uuid-del-cliente", "contenido": "Hola, ¿en qué te ayudo?" }
```

---

### Panel admin — marcar presencia en el panel

Suspende emails de notificación mientras el admin está activo.

**Publicar en:**
```
/app/chat.admin.conectado
```
Sin payload.

---

## Endpoints REST

### Historial por usuario — cargar al iniciar el chat

```
GET /mis-productos/v1/chat/historial/usuario/{usuarioId}?pagina=0&size=20
```
Sin token. Público.

**Response** — leer `response.data`, **NO** `response` directamente:
```json
{
  "mensaje": "La peticion fue exitosa",
  "code": 200,
  "data": {
    "mensajes": [
      { "remitente": "USUARIO", "contenido": "Hola",       "timestamp": "2026-06-18T02:35:16" },
      { "remitente": "ADMIN",   "contenido": "Como estas", "timestamp": "2026-06-18T02:35:47" }
    ],
    "pagina": 0,
    "totalPaginas": 3,
    "totalMensajes": 45,
    "hayMasAntiguos": true
  },
  "lista": null
}
```

Campos del mensaje: `remitente` (`"USUARIO"` o `"ADMIN"`), `contenido`, `timestamp`. Los campos `id` y `sesionId` no aparecen (`@JsonIgnore`).

**Scroll hacia arriba — cargar más antiguos:**
```
GET /mis-productos/v1/chat/historial/usuario/{usuarioId}?pagina=1&size=20
```
Cuando `hayMasAntiguos === true` → pedir `pagina + 1` y hacer **prepend**:
```typescript
this.mensajes = [...mensajesAntiguos, ...this.mensajes];
```

---

### Historial por sesión — panel admin

```
GET /mis-productos/v1/chat/admin/historial/{sesionId}?pagina=0&size=20
Authorization: Bearer <token admin>
```
Mismo formato de response que el anterior.

---

### Listado de sesiones — panel admin

Devuelve todas las sesiones de las últimas 24 h (activas y cerradas).

```
GET /mis-productos/v1/chat/admin/sesiones
Authorization: Bearer <token admin>
```

**Response** — leer `response.data`, **NO** como array:
```json
{
  "data": [
    {
      "sesionId": "94bb63c0-...",
      "nombreUsuario": "Juan",
      "estado": "ACTIVA",
      "fechaInicio": "2026-06-18T02:35:07",
      "ultimaActividad": "2026-06-18T02:35:47",
      "ultimoMensaje": "Como estas"
    },
    {
      "sesionId": "2e46efe3-...",
      "nombreUsuario": "María",
      "estado": "CERRADA",
      "fechaInicio": "2026-06-18T01:38:16",
      "ultimaActividad": "2026-06-18T01:42:00",
      "ultimoMensaje": "Gracias"
    }
  ]
}
```
`estado`: `"ACTIVA"` o `"CERRADA"`.

---

### Cerrar sesión — panel admin

```
POST /mis-productos/v1/chat/admin/cerrar/{sesionId}
Authorization: Bearer <token admin>
```
Response: 204 No Content.

---

## Código de referencia — componente Angular del cliente

```typescript
export class ChatComponent implements OnInit {

  usuarioId: number;
  sesionId: string | null = null;
  mensajes: any[] = [];
  hayMasAntiguos = false;
  paginaActual = 0;
  private stompClient: Client;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.usuarioId = this.authService.getCurrentUser()?.id;
  }

  ngOnInit() {
    if (!this.usuarioId) return; // solo usuarios logueados

    // PASO 1: cargar historial ANTES de conectar WebSocket
    this.cargarHistorial();

    // PASO 2: conectar WebSocket
    this.conectarWebSocket();
  }

  cargarHistorial() {
    this.http.get(`/v1/chat/historial/usuario/${this.usuarioId}?pagina=0&size=20`)
      .subscribe(res => {
        this.mensajes       = (res as any).data?.mensajes      ?? [];
        this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
        this.paginaActual   = 0;
      });
  }

  conectarWebSocket() {
    const tempId = crypto.randomUUID();

    this.stompClient.subscribe(`/topic/chat.inicio.${tempId}`, frame => {
      const data = JSON.parse(frame.body);
      this.sesionId = data.sesionId;
      sessionStorage.setItem('chat_sesion_id', this.sesionId);

      this.stompClient.subscribe(`/topic/chat.usuario.${this.sesionId}`, frame2 => {
        const evento = JSON.parse(frame2.body);
        if (evento.tipo === 'MENSAJE') {
          this.mensajes = [...this.mensajes, evento];
        } else if (evento.tipo === 'SESION_CERRADA') {
          sessionStorage.removeItem('chat_sesion_id');
          this.sesionId = null;
          // mensajes se mantienen visibles
        }
      });
    });

    this.stompClient.publish({
      destination: '/app/chat.conectar',
      body: JSON.stringify({
        tempId,
        nombreUsuario: this.authService.getCurrentUser()?.username,
        usuarioId: this.usuarioId
      })
    });
  }

  cargarMasAntiguos() {
    if (!this.hayMasAntiguos) return;
    this.paginaActual++;
    this.http.get(`/v1/chat/historial/usuario/${this.usuarioId}?pagina=${this.paginaActual}&size=20`)
      .subscribe(res => {
        const antiguos      = (res as any).data?.mensajes      ?? [];
        this.mensajes       = [...antiguos, ...this.mensajes]; // prepend
        this.hayMasAntiguos = (res as any).data?.hayMasAntiguos ?? false;
      });
  }

  enviarMensaje(contenido: string) {
    if (!contenido?.trim()) return;

    if (!this.sesionId) {
      // sesión expirada → reconectar y recargar historial
      this.conectarWebSocket();
      this.cargarHistorial();
      return;
    }

    this.stompClient.publish({
      destination: '/app/chat.mensaje',
      body: JSON.stringify({ sesionId: this.sesionId, contenido })
    });

    // agregar optimistamente
    this.mensajes = [...this.mensajes, {
      remitente: 'USUARIO',
      contenido,
      timestamp: new Date().toISOString().slice(0, 19)
    }];
  }
}
```

---

## Errores comunes

| Error | Síntoma | Corrección |
|---|---|---|
| Leer `response` como array | `mensajes` undefined o vacío | Leer `(res as any).data.mensajes` |
| No llamar historial en `ngOnInit` | Pantalla vacía al recargar aunque haya datos | Llamar `cargarHistorial()` antes de conectar WS |
| Enviar mensaje con sesión expirada | Mensaje se descarta silenciosamente | Verificar `sesionId !== null` y reconectar si hace falta |
| Prepend incorrecto al cargar más | Mensajes antiguos aparecen al final | `[...antiguos, ...this.mensajes]` — antiguos primero |
| `@Query` JPA con subquery sin `countQuery` | Paginación retorna siempre vacío (`totalMensajes: 0`) | Agregar `countQuery` explícito — ver pitfall en CAMBIOS_FRONT.md |
