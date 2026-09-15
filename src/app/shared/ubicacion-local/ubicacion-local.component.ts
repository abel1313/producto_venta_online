import { Component, Input, OnChanges } from '@angular/core';

/**
 * Miniatura del mapa del local para el login y el registro, con botón "Cómo llegar".
 *
 * ⚠️ NO usa Leaflet a propósito, aunque el proyecto ya lo tenga: login y registro son las
 * PRIMERAS pantallas que carga cualquiera (incluido quien nunca se registra), y el bundle
 * inicial ya va por encima del presupuesto. Aquí las teselas de OpenStreetMap se piden como
 * `<img>` sueltas y el pin se dibuja encima — un mapa que no se puede mover, que es justo lo
 * que hace falta: el cliente no viene a explorar, viene a ver dónde está y tocar para que se
 * le abra la ruta. El mapa de verdad (con zoom y arrastre) vive en Configuración del negocio,
 * que sí es una pantalla de adentro.
 *
 * "Cómo llegar" es un link normal a Google Maps con `dir/?api=1&destination=lat,lng`: no
 * necesita API key ni cuenta. Google le pide al cliente su ubicación y traza la ruta desde
 * donde esté; en celular abre la app, en computadora la página.
 */
@Component({
  selector: 'app-ubicacion-local',
  templateUrl: './ubicacion-local.component.html',
  styleUrls: ['./ubicacion-local.component.scss']
})
export class UbicacionLocalComponent implements OnChanges {
  @Input() direccion: string | null = null;
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;

  /** Ancho/alto de la miniatura en px. Fijos porque con ellos se calculan las teselas. */
  private static readonly ANCHO = 316;
  private static readonly ALTO  = 118;
  private static readonly ZOOM  = 16;
  private static readonly TESELA = 256;

  teselas: Array<{ url: string; x: number; y: number }> = [];
  urlComoLlegar = '';

  get hayUbicacion(): boolean {
    return this.lat != null && this.lng != null;
  }

  ngOnChanges(): void {
    if (!this.hayUbicacion) {
      this.teselas = [];
      this.urlComoLlegar = '';
      return;
    }
    this.urlComoLlegar =
      `https://www.google.com/maps/dir/?api=1&destination=${this.lat},${this.lng}`;
    this.teselas = this.calcularTeselas(this.lat!, this.lng!);
  }

  /**
   * Proyección Web Mercator estándar: pasa lat/lng a píxel absoluto del mundo en este zoom,
   * recorta la ventana de la miniatura alrededor de ese punto y devuelve las teselas que caen
   * dentro, cada una ya posicionada. El punto queda justo en el centro, que es donde se pinta
   * el pin.
   */
  private calcularTeselas(lat: number, lng: number): Array<{ url: string; x: number; y: number }> {
    const { ANCHO, ALTO, ZOOM, TESELA } = UbicacionLocalComponent as any;
    const escala = TESELA * Math.pow(2, ZOOM);

    const senoLat = Math.sin((lat * Math.PI) / 180);
    const mundoX = ((lng + 180) / 360) * escala;
    const mundoY = (0.5 - Math.log((1 + senoLat) / (1 - senoLat)) / (4 * Math.PI)) * escala;

    const izq = mundoX - ANCHO / 2;
    const arr = mundoY - ALTO / 2;

    const maxIndice = Math.pow(2, ZOOM) - 1;
    const salida: Array<{ url: string; x: number; y: number }> = [];

    for (let tx = Math.floor(izq / TESELA); tx <= Math.floor((izq + ANCHO) / TESELA); tx++) {
      for (let ty = Math.floor(arr / TESELA); ty <= Math.floor((arr + ALTO) / TESELA); ty++) {
        if (ty < 0 || ty > maxIndice) continue;            // fuera del mundo por arriba/abajo
        const txEnvuelto = ((tx % (maxIndice + 1)) + maxIndice + 1) % (maxIndice + 1); // el mundo da la vuelta en X
        salida.push({
          url: `https://tile.openstreetmap.org/${ZOOM}/${txEnvuelto}/${ty}.png`,
          x: Math.round(tx * TESELA - izq),
          y: Math.round(ty * TESELA - arr)
        });
      }
    }
    return salida;
  }
}
