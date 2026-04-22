import { Injectable } from '@angular/core';
// import { Client, IMessage } from '@stomp/stompjs';
// import * as SockJS from 'sockjs-client';
// import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketServiceService {
  // private client: Client;
  // private connected = false;

  constructor() {
    /*
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.api_Url}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.connected = true;
    };

    this.client.activate();
    */
  }

  suscribirRuleta(_callback: (mensaje: any) => void): () => void {
    /*
    const subscribe = () => {
      const sub = this.client.subscribe('/topic/ruleta', (message: IMessage) => {
        try {
          _callback(JSON.parse(message.body));
        } catch {
          _callback(message.body);
        }
      });
      return () => sub.unsubscribe();
    };

    if (this.connected) {
      return subscribe();
    }

    let unsub: () => void = () => {};
    const original = this.client.onConnect;
    this.client.onConnect = (frame) => {
      original?.call(this.client, frame);
      unsub = subscribe();
    };
    return () => unsub();
    */
    return () => {};
  }
}
