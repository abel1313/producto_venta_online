import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';


@Injectable({
  providedIn: 'root'
})
export class WebSocketServiceService {
private client: Client;
    constructor() {
    this.client = new Client({
      brokerURL: 'ws://localhost:8081/mis-productos/ws',
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      webSocketFactory: () => new SockJS('http://localhost:8081/mis-productos/ws')
    });

    this.client.activate();
  }
  enviarActualizacion(mensaje: string) {
    console.log("paso mensaje ", mensaje)
    this.client.publish({ destination: '/app/actualizar', body: mensaje });
  }

  recibirActualizaciones(callback: (mensaje: string) => void) {
  if (!this.client || !this.client.connected) {
    console.warn("⚠️ WebSocket aún no está conectado. Esperando...");
    setTimeout(() => this.recibirActualizaciones(callback), 1000); // 🔥 Reintenta después de 1 segundo
    return;
  }
  this.client.subscribe('/topic/ruleta', (message) => {
    console.log(' ****************************************************** ')
    console.log(message)
    callback(message.body);
  });

  }

}
