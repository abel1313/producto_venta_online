import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';
import { IVarianteRequest } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';
import { comprimirImagen, IImagenBase64 } from '../imagen-comprimir.util';

/** Lo que el modal necesita saber del modelo. */
export interface ModeloParaArticulos {
  id: number;
  nombre: string;
  /** Stock total del modelo. */
  stock: number;
  /** Stock que ya tienen sus artículos habilitados (0 en un modelo recién dado de alta). */
  enArticulos: number;
  color?: string | null;
  marca?: string | null;
  descripcion?: string | null;
  contenido?: string | null;
  categoria?: IPalabraClave | null;
  tieneImagen: boolean;
}

type CampoCopiable = 'color' | 'marca' | 'descripcion' | 'contenidoNeto';

interface Copiable {
  campo: CampoCopiable | 'categoria' | 'imagen';
  etiqueta: string;
  valor: string;
  marcado: boolean;
}

interface FormArticulo {
  talla: string;
  color: string;
  marca: string;
  presentacion: string;
  contenidoNeto: string;
  descripcion: string;
  stock: number | null;
  categoria: IPalabraClave | null;
  foto: IImagenBase64 | null;
  fotoPreview: string | null;
}

/**
 * Agregar los artículos de un modelo en un solo paso (PLAN_ALTA_MODELO_Y_ARTICULOS.md, flujo A).
 *
 * Lo abren dos pantallas: Agregar modelo, al guardar uno nuevo (primero pregunta "¿Quieres agregar
 * sus artículos ahora?"), y la tarjeta del modelo en Catálogo → 🔍 Modelos (botón 🧩 Artículos), que
 * va directo a los formularios.
 *
 * Reglas (A3–A12): casillas solo de lo que el modelo tiene lleno, todas marcadas; talla,
 * presentación y stock nunca se copian; cada artículo con stock ≥ 1 y la suma sin pasar del stock
 * libre del modelo, avisando mientras se escribe; se guardan todos o ninguno.
 */
@Component({
  selector: 'app-alta-articulos',
  templateUrl: './alta-articulos.component.html',
  styleUrls: ['./alta-articulos.component.scss']
})
export class AltaArticulosComponent implements OnInit {

  @Input() modelo!: ModeloParaArticulos;
  /** true: primero pregunta si quiere agregarlos ahora (Agregar modelo). */
  @Input() preguntarPrimero = false;
  /** true si se guardaron artículos. */
  @Output() cerrar = new EventEmitter<boolean>();

  paso: 'pregunta' | 'formularios' = 'formularios';
  copiables: Copiable[] = [];
  cantidad = 1;
  mismoStock: number | null = null;
  formularios: FormArticulo[] = [];
  guardando = false;
  error = '';

  constructor(private readonly varianteService: VarianteService) {}

  ngOnInit(): void {
    this.paso = this.preguntarPrimero ? 'pregunta' : 'formularios';
    const m = this.modelo;
    const lleno = (v?: string | null) => !!v && v.trim() !== '';
    this.copiables = [
      ...(lleno(m.color)       ? [{ campo: 'color' as const,         etiqueta: 'Color',         valor: m.color!,       marcado: true }] : []),
      ...(lleno(m.marca)       ? [{ campo: 'marca' as const,         etiqueta: 'Marca',         valor: m.marca!,       marcado: true }] : []),
      ...(lleno(m.descripcion) ? [{ campo: 'descripcion' as const,   etiqueta: 'Descripción',   valor: m.descripcion!, marcado: true }] : []),
      ...(lleno(m.contenido)   ? [{ campo: 'contenidoNeto' as const, etiqueta: 'Contenido neto', valor: m.contenido!,  marcado: true }] : []),
      ...(m.categoria          ? [{ campo: 'categoria' as const,     etiqueta: 'Categoría',     valor: m.categoria.nombre, marcado: true }] : []),
      ...(m.tieneImagen        ? [{ campo: 'imagen' as const,        etiqueta: 'Foto del modelo', valor: 'la misma foto, sin subirla otra vez', marcado: true }] : [])
    ];
    this.cantidad = this.libre > 0 ? 1 : 0;
    this.ajustarFormularios();
  }

  // ── Stock ──────────────────────────────────────────────────────────────

  get libre(): number {
    return Math.max((this.modelo.stock ?? 0) - (this.modelo.enArticulos ?? 0), 0);
  }

  get repartido(): number {
    return this.formularios.reduce((s, f) => s + (Number(f.stock) || 0), 0);
  }

  get teQuedan(): number {
    return this.libre - this.repartido;
  }

  stockInvalido(f: FormArticulo): boolean {
    return f.stock !== null && f.stock !== undefined && (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 1);
  }

  get faltaStock(): boolean {
    return this.formularios.some(f => f.stock === null || f.stock === undefined || this.stockInvalido(f));
  }

  get puedeGuardar(): boolean {
    return !this.guardando && this.formularios.length > 0 && !this.cantidadFueraDeRango
      && !this.faltaStock && this.teQuedan >= 0;
  }

  // ── Pregunta inicial ─────────────────────────────────────────────────

  siAgregar(): void {
    this.paso = 'formularios';
  }

  despues(): void {
    this.cerrar.emit(false);
  }

  // ── Cuántos y qué se copia ───────────────────────────────────────────

  marcado(campo: Copiable['campo']): boolean {
    return this.copiables.some(c => c.campo === campo && c.marcado);
  }

  /** Mismos formularios de antes; se agregan o quitan al final para no perder lo que ya se llenó. */
  ajustarFormularios(): void {
    const n = Math.max(0, Math.min(Math.floor(Number(this.cantidad) || 0), this.libre));
    while (this.formularios.length < n) this.formularios.push(this.nuevoFormulario());
    this.formularios.length = n;
  }

  get cantidadFueraDeRango(): boolean {
    const n = Number(this.cantidad) || 0;
    return n < 1 || n > this.libre;
  }

  private nuevoFormulario(): FormArticulo {
    const valor = (campo: CampoCopiable) => this.copiables.find(c => c.campo === campo && c.marcado)?.valor ?? '';
    return {
      talla: '',
      color: valor('color'),
      marca: valor('marca'),
      presentacion: '',
      contenidoNeto: valor('contenidoNeto'),
      descripcion: valor('descripcion'),
      stock: this.mismoStock,
      categoria: null,
      foto: null,
      fotoPreview: null
    };
  }

  /** Marcar llena el dato en todos; desmarcar lo vacía donde seguía igual al del modelo. */
  alCambiarCopiable(c: Copiable): void {
    if (c.campo === 'categoria' || c.campo === 'imagen') return;
    const campo = c.campo;
    for (const f of this.formularios) {
      if (c.marcado && !f[campo]) f[campo] = c.valor;
      if (!c.marcado && f[campo] === c.valor) f[campo] = '';
    }
  }

  aplicarMismoStock(): void {
    const s = Number(this.mismoStock);
    if (!(s >= 1)) return;
    this.formularios.forEach(f => f.stock = s);
  }

  // ── Foto propia de un artículo ───────────────────────────────────────

  async elegirFoto(f: FormArticulo, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      f.foto = await comprimirImagen(file);
      f.fotoPreview = `data:image/jpeg;base64,${f.foto.base64}`;
    } catch (e: any) {
      Swal.fire({ icon: 'warning', title: 'No se pudo usar la foto', text: e?.message ?? 'Intenta con otra.' });
    }
  }

  quitarFoto(f: FormArticulo): void {
    f.foto = null;
    f.fotoPreview = null;
  }

  // ── Guardar ──────────────────────────────────────────────────────────

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.error = '';
    const categoriaModelo = this.marcado('categoria') ? (this.modelo.categoria?.id ?? null) : null;
    const fotoModelo = this.marcado('imagen');
    const payload: IVarianteRequest[] = this.formularios.map(f => ({
      productoId: this.modelo.id,
      talla: f.talla.trim(),
      color: f.color.trim(),
      marca: f.marca.trim(),
      presentacion: f.presentacion.trim(),
      contenidoNeto: f.contenidoNeto.trim(),
      descripcion: f.descripcion.trim(),
      stock: Number(f.stock),
      palabraClaveId: categoriaModelo ?? f.categoria?.id ?? null,
      listImagenes: f.foto ? [f.foto] : [],
      // Cada formulario se queda con su foto; si no subió una, usa la del modelo (A8).
      imagenesPropias: true,
      usarImagenDelModelo: fotoModelo && !f.foto
    }));

    this.guardando = true;
    this.varianteService.save(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.varianteService.invalidarCache();
        Swal.fire({
          icon: 'success',
          title: payload.length === 1 ? '1 artículo guardado' : `${payload.length} artículos guardados`,
          text: `Ya se pueden vender. Stock repartido: ${this.repartido} de ${this.modelo.stock}.`,
          confirmButtonText: 'Entendido'
        }).then(() => this.cerrar.emit(true));
      },
      error: err => {
        this.guardando = false;
        // Se guardan todos o ninguno (A9): los datos se quedan en pantalla para corregir.
        this.error = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudieron guardar los artículos. No se guardó ninguno.';
      }
    });
  }

  trackPorIndice(i: number): number {
    return i;
  }
}
