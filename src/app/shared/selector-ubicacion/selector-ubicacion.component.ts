import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

// Centro genérico fijo — Tejupilco, Edo. México (misma zona real de entrega del negocio).
// Se usa como fallback cuando no hay lat/lng por zona (`LugarEntrega.latitud/longitud` en null,
// zonas viejas sin capturar el dato) o todavía no se eligió zona. Exportado para que los
// componentes que pasan `centroDefault` según la zona elegida (venta-variante,
// configurar-ramo) puedan caer en este mismo punto sin duplicar las coordenadas.
export const CENTRO_MAPA_GENERICO: [number, number] = [18.916234, -100.143567];

/**
 * Selector de ubicación exacta en mapa (Leaflet + OpenStreetMap, sin costo ni API key).
 * Clic o arrastrar el pin para marcar el punto; botón "usar mi ubicación" vía geolocalización
 * del navegador. Emite `ubicacionCambio` solo cuando el usuario de verdad toca el mapa — nunca
 * al solo mostrarse, para no confundir "el mapa está centrado aquí" con "ya elegiste este punto".
 */
@Component({
  selector: 'app-selector-ubicacion',
  template: `
    <div class="su-buscar">
      <input type="text" class="su-buscar__input" placeholder="Busca un lugar (ej. Zacazonapan centro)…"
             [(ngModel)]="terminoBusqueda" (keydown.enter)="buscarLugar()">
      <button type="button" class="su-buscar__btn" [disabled]="buscando || !terminoBusqueda.trim()" (click)="buscarLugar()">
        {{ buscando ? '…' : '🔍' }}
      </button>
    </div>
    <p class="su-buscar__error" *ngIf="errorBusqueda">{{ errorBusqueda }}</p>
    <div #mapaEl class="su-mapa"></div>
    <div class="su-row">
      <span class="su-coords">{{ textoCoords }}</span>
      <button type="button" class="su-geo" (click)="usarMiUbicacion()">📡 Usar mi ubicación</button>
    </div>
    <p class="su-hint">Busca la zona arriba para llegar rápido, y toca el mapa (o arrastra el pin) para marcar el punto exacto.</p>
  `,
  styles: [`
    .su-buscar { display:flex; gap:6px; margin-bottom:6px; }
    .su-buscar__input { flex:1; min-width:0; padding:7px 10px; border-radius:8px; border:1.5px solid var(--card-border, #e5e7eb); background:var(--card-bg, #fff); color:var(--app-text, #1f2937); font-size:.82rem; }
    .su-buscar__input:focus { outline:none; border-color:var(--app-accent, #007AFF); }
    .su-buscar__btn { flex-shrink:0; border:1.5px solid var(--card-border, #e5e7eb); background:var(--card-bg, #fff); border-radius:8px; padding:0 12px; cursor:pointer; font-size:.9rem; }
    .su-buscar__btn:disabled { opacity:.5; cursor:default; }
    .su-buscar__error { font-size:.76rem; color:#dc2626; margin:0 0 6px; }
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
  // Centro por defecto cuando todavía no hay punto marcado. El padre lo sobreescribe con las
  // coordenadas de la zona elegida (`LugarEntrega.latitud/longitud`) cuando esa zona sí las
  // tiene capturadas; si vienen null (zona vieja) el padre debe seguir pasando este mismo
  // genérico — ver `CENTRO_MAPA_GENERICO` arriba.
  @Input() centroDefault: [number, number] = CENTRO_MAPA_GENERICO;
  @Output() ubicacionCambio = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('mapaEl') mapaEl!: ElementRef<HTMLDivElement>;

  textoCoords = 'Sin marcar todavía';
  private mapa: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Buscador de dirección libre (Nominatim / OpenStreetMap — gratis, sin API key). Sirve para
  // saltar directo a la zona (ej. "Zacazonapan centro") en vez de tener que ubicarla a ojo desde
  // el centro genérico de Tejupilco. Solo RECENTRA el mapa — no coloca el pin solo, el punto
  // exacto sigue marcándose con un toque/clic sobre el mapa, a propósito (buscar ≠ confirmar).
  terminoBusqueda = '';
  buscando = false;
  errorBusqueda: string | null = null;

  constructor(private readonly http: HttpClient) {}

  buscarLugar(): void {
    const q = this.terminoBusqueda.trim();
    if (!q || this.buscando) return;
    this.buscando = true;
    this.errorBusqueda = null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(q)}`;
    this.http.get<Array<{ lat: string; lon: string }>>(url).subscribe({
      next: (res) => {
        this.buscando = false;
        if (!res?.length) {
          this.errorBusqueda = 'No se encontró ese lugar — prueba con otro nombre o ubica el punto directo en el mapa.';
          return;
        }
        const lat = parseFloat(res[0].lat);
        const lon = parseFloat(res[0].lon);
        this.mapa?.setView([lat, lon], 15);
      },
      error: () => {
        this.buscando = false;
        this.errorBusqueda = 'No se pudo buscar ahorita — ubica el punto directo en el mapa.';
      }
    });
  }

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

  // El cliente no tiene por qué ver los números crudos de latitud/longitud — no le dicen nada.
  // Solo se confirma que sí hay un punto marcado; el dato real (lat/lng) se sigue capturando y
  // enviando igual, solo no se muestra en pantalla.
  private actualizarTexto(): void {
    this.textoCoords = (this.lat != null && this.lng != null)
      ? '✅ Ubicación marcada'
      : 'Sin marcar todavía';
  }
}
