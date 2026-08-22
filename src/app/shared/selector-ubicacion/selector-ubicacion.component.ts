import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

// Mismo fix ya usado en mis-pedidos.component.ts — Leaflet calcula la URL de sus íconos por
// defecto en base a dónde quedó su propio bundle, y con Angular/webpack casi siempre la
// resuelve mal (el pin sale invisible, sin error en consola). Este es el ÚNICO lugar del
// proyecto donde debería tocarse `L.Icon.Default` — si se usa el mapa en más pantallas, se
// reutiliza este componente en vez de repetir el fix.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

/**
 * Selector de ubicación exacta en mapa (Leaflet + OpenStreetMap, sin costo ni API key).
 * Clic o arrastrar el pin para marcar el punto; botón "usar mi ubicación" vía geolocalización
 * del navegador. Emite `ubicacionCambio` solo cuando el usuario de verdad toca el mapa — nunca
 * al solo mostrarse, para no confundir "el mapa está centrado aquí" con "ya elegiste este punto".
 */
@Component({
  selector: 'app-selector-ubicacion',
  template: `
    <div #mapaEl class="su-mapa"></div>
    <div class="su-row">
      <span class="su-coords">{{ textoCoords }}</span>
      <button type="button" class="su-geo" (click)="usarMiUbicacion()">📡 Usar mi ubicación</button>
    </div>
    <p class="su-hint">Toca el mapa (o arrastra el pin) para marcar el punto exacto.</p>
  `,
  styles: [`
    .su-mapa { width:100%; height:200px; border-radius:10px; border:1.5px solid var(--card-border, #e5e7eb); }
    .su-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; }
    .su-coords { font-size:.8rem; font-weight:600; color:var(--app-text, #1f2937); }
    .su-geo { border:none; background:none; padding:0; cursor:pointer; font-size:.76rem; font-weight:700; color:var(--app-accent, #007AFF); flex-shrink:0; }
    .su-geo:hover { text-decoration:underline; }
    .su-hint { font-size:.74rem; color:var(--app-text-muted, #6b7280); margin:6px 0 0; }
  `]
})
export class SelectorUbicacionComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  // Centro por defecto cuando todavía no hay punto marcado — Tejupilco, Edo. México (misma
  // zona real de entrega del negocio). No hay lat/lng por zona en el catálogo de LugarEntrega
  // todavía, así que es un solo centro genérico sin importar qué zona haya elegido el cliente.
  @Input() centroDefault: [number, number] = [18.916234, -100.143567];
  @Output() ubicacionCambio = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('mapaEl') mapaEl!: ElementRef<HTMLDivElement>;

  textoCoords = 'Sin marcar todavía';
  private mapa: L.Map | null = null;
  private marker: L.Marker | null = null;

  ngAfterViewInit(): void {
    const tocado = this.lat != null && this.lng != null;
    const centro: L.LatLngTuple = tocado ? [this.lat!, this.lng!] : this.centroDefault;
    this.mapa = L.map(this.mapaEl.nativeElement, { attributionControl: false }).setView(centro, tocado ? 16 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc'
    }).addTo(this.mapa);

    if (tocado) this.colocar(this.lat!, this.lng!, false);
    this.actualizarTexto();

    this.mapa.on('click', (e: L.LeafletMouseEvent) => this.colocar(e.latlng.lat, e.latlng.lng, true));

    // Leaflet mide el contenedor al crearse; si el <div> todavía no tenía tamaño real en ese
    // instante (dentro de un acordeón/paso que recién se mostró), el mapa sale recortado.
    // invalidateSize() lo corrige una vez que el layout ya asentó.
    setTimeout(() => this.mapa?.invalidateSize(), 60);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si el padre cambia de zona (otro `centroDefault`) DESPUÉS de que el mapa ya existe y
    // todavía no se marcó ningún punto, recentrar ahí — para que el mapa muestre la zona
    // elegida en vez de quedarse en el centro genérico inicial.
    if (changes['centroDefault'] && this.mapa && this.lat == null && this.lng == null) {
      this.mapa.setView(this.centroDefault, 13);
    }
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
  }

  usarMiUbicacion(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.colocar(pos.coords.latitude, pos.coords.longitude, true);
        this.mapa?.setView([pos.coords.latitude, pos.coords.longitude], 17);
      },
      () => { /* permiso denegado o no disponible — el clic manual en el mapa sigue funcionando */ }
    );
  }

  private colocar(lat: number, lng: number, emitir: boolean): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else if (this.mapa) {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.mapa);
      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.colocar(p.lat, p.lng, true);
      });
    }
    this.lat = lat;
    this.lng = lng;
    this.actualizarTexto();
    if (emitir) this.ubicacionCambio.emit({ lat, lng });
  }

  private actualizarTexto(): void {
    this.textoCoords = (this.lat != null && this.lng != null)
      ? `📍 ${this.lat.toFixed(6)}, ${this.lng.toFixed(6)}`
      : 'Sin marcar todavía';
  }
}
