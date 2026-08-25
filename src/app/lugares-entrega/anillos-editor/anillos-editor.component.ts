import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { IAnilloLugarEntrega } from '../models/lugar-entrega.model';
import { LugarEntregaService } from '../service/lugar-entrega.service';

const RADIO_TIERRA_METROS = 6371000;
const COLORES = ['#007AFF', '#e91e63', '#f4511e', '#00897b', '#7b1fa2', '#f9a825'];

// Editor de anillos (rangos de distancia con precio propio) alrededor del centro de una zona --
// ver DISENO_ZONAS_POR_ANILLO.md (repo compartido). Cada anillo se dibuja como un circulo de
// Leaflet con una "manija" arrastrable (L.Marker, no L.CircleMarker -- ese no soporta drag
// nativo) que arranca al norte del centro; arrastrarla hacia/desde el centro cambia el radio en
// vivo. El radio y el costo tambien se pueden escribir directo en la lista, sin arrastrar nada.
@Component({
  selector: 'app-anillos-editor',
  templateUrl: './anillos-editor.component.html',
  styleUrls: ['./anillos-editor.component.scss']
})
export class AnillosEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lugarEntregaId!: number;
  @Input() centroLat!: number;
  @Input() centroLng!: number;

  @ViewChild('mapaEl') mapaEl!: ElementRef<HTMLDivElement>;

  anillos: IAnilloLugarEntrega[] = [];
  cargando = false;
  guardandoId: number | null = null;

  nuevoRadio: number | null = 300;
  nuevoCosto: number | null = null;
  agregando = false;

  private mapa: L.Map | null = null;
  private centroMarker: L.Marker | null = null;
  private circulos = new Map<number, L.Circle>();
  private manijas = new Map<number, L.Marker>();

  constructor(private readonly svc: LugarEntregaService) {}

  ngAfterViewInit(): void {
    this.inicializarMapa();
    this.cargar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si el padre cambia de zona (otra fila en edicion) despues de que el mapa ya existe,
    // recentrar y volver a cargar los anillos de la nueva zona.
    if ((changes['lugarEntregaId'] && !changes['lugarEntregaId'].firstChange) && this.mapa) {
      this.mapa.setView([this.centroLat, this.centroLng], 14);
      this.centroMarker?.setLatLng([this.centroLat, this.centroLng]);
      this.cargar();
    }
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
  }

  private inicializarMapa(): void {
    this.mapa = L.map(this.mapaEl.nativeElement, { attributionControl: false })
      .setView([this.centroLat, this.centroLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc'
    }).addTo(this.mapa);
    this.centroMarker = L.marker([this.centroLat, this.centroLng]).addTo(this.mapa);
    // Mismo motivo que SelectorUbicacionComponent: el contenedor puede no tener tamano real
    // todavia cuando Leaflet mide (dentro de una fila que recien se expandio).
    setTimeout(() => this.mapa?.invalidateSize(), 60);
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getAnillos(this.lugarEntregaId).subscribe({
      next: data => {
        this.anillos = [...data].sort((a, b) => a.radioMetros - b.radioMetros);
        this.cargando = false;
        this.redibujarTodos();
      },
      error: () => { this.cargando = false; }
    });
  }

  private redibujarTodos(): void {
    if (!this.mapa) return;
    this.circulos.forEach(c => c.remove());
    this.manijas.forEach(m => m.remove());
    this.circulos.clear();
    this.manijas.clear();
    this.anillos.forEach((a, i) => this.dibujarAnillo(a, i));
  }

  colorDe(id: number): string {
    const i = this.anillos.findIndex(a => a.id === id);
    return COLORES[(i >= 0 ? i : 0) % COLORES.length];
  }

  private dibujarAnillo(a: IAnilloLugarEntrega, indice: number): void {
    if (!this.mapa) return;
    const centro: L.LatLngExpression = [this.centroLat, this.centroLng];
    const color = COLORES[indice % COLORES.length];

    const circulo = L.circle(centro, { radius: a.radioMetros, color, weight: 2, fillOpacity: 0.08 }).addTo(this.mapa);
    this.circulos.set(a.id, circulo);

    // La manija arranca al norte (bearing 0°) del centro, a distancia = radio actual.
    const puntoInicial = puntoADistancia(this.centroLat, this.centroLng, a.radioMetros, 0);
    const manija = L.marker(puntoInicial, {
      draggable: true,
      icon: L.divIcon({
        className: 'ae-manija',
        html: `<span style="background:${color}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(this.mapa);

    manija.on('drag', () => {
      const p = manija.getLatLng();
      const distancia = distanciaMetros(this.centroLat, this.centroLng, p.lat, p.lng);
      circulo.setRadius(distancia);
      a.radioMetros = Math.round(distancia);
    });
    manija.on('dragend', () => this.guardar(a));

    this.manijas.set(a.id, manija);
  }

  // Cambio manual del radio/costo escrito en la lista (sin arrastrar) -- sincroniza el circulo
  // y la manija en el mapa para que no queden desfasados de lo que se acaba de escribir.
  onCambioManual(a: IAnilloLugarEntrega): void {
    const circulo = this.circulos.get(a.id);
    const manija = this.manijas.get(a.id);
    if (circulo) circulo.setRadius(a.radioMetros);
    if (manija) manija.setLatLng(puntoADistancia(this.centroLat, this.centroLng, a.radioMetros, 0));
    this.guardar(a);
  }

  private guardar(a: IAnilloLugarEntrega): void {
    if (a.radioMetros <= 0 || a.costoEnvio == null || a.costoEnvio < 0) return;
    this.guardandoId = a.id;
    this.svc.editarAnillo(a.id, { radioMetros: a.radioMetros, costoEnvio: a.costoEnvio, orden: a.orden }).subscribe({
      next: () => { this.guardandoId = null; },
      error: err => {
        this.guardandoId = null;
        Swal.fire({ icon: 'error', title: 'No se pudo guardar el anillo', text: err?.error?.mensaje ?? undefined, timer: 2000, showConfirmButton: false });
      }
    });
  }

  agregar(): void {
    if (!this.nuevoRadio || this.nuevoRadio <= 0 || this.nuevoCosto == null || this.nuevoCosto < 0) {
      Swal.fire({ icon: 'warning', title: 'Falta radio o costo', timer: 1600, showConfirmButton: false });
      return;
    }
    this.agregando = true;
    this.svc.crearAnillo(this.lugarEntregaId, { radioMetros: this.nuevoRadio, costoEnvio: this.nuevoCosto }).subscribe({
      next: () => {
        this.agregando = false;
        this.nuevoRadio = 300;
        this.nuevoCosto = null;
        this.cargar();
      },
      error: err => {
        this.agregando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo agregar el anillo', text: err?.error?.mensaje ?? undefined });
      }
    });
  }

  eliminar(a: IAnilloLugarEntrega): void {
    Swal.fire({
      title: `¿Eliminar el anillo de ${a.radioMetros}m?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.eliminarAnillo(a.id).subscribe({
        next: () => this.cargar(),
        error: err => Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err?.error?.mensaje ?? undefined })
      });
    });
  }
}

// ── Geometría (haversine) ──────────────────────────────────────────────────

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_METROS * c;
}

// Punto destino dado un centro, una distancia (metros) y un rumbo (grados, 0 = norte).
function puntoADistancia(lat: number, lon: number, distancia: number, bearingDeg: number): L.LatLngTuple {
  const δ = distancia / RADIO_TIERRA_METROS;
  const θ = bearingDeg * Math.PI / 180;
  const φ1 = lat * Math.PI / 180;
  const λ1 = lon * Math.PI / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}
