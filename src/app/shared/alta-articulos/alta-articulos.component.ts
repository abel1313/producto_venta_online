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

/** Lo que se puede cambiar en un artículo; lo que no se marca queda igual al modelo. */
export type CampoQueCambia = 'foto' | 'descripcion' | 'color' | 'marca' | 'contenidoNeto' | 'categoria';

type CampoDeTexto = 'descripcion' | 'color' | 'marca' | 'contenidoNeto';

interface FormArticulo {
  /** Plegado o abierto (QA 2026-10-14: con 20 o 30 artículos la lista se hacía enorme). */
  abierto: boolean;
  talla: string;
  presentacion: string;
  stock: number | null;
  /** Check por campo (QA 2026-10-14): marcado = ese dato es distinto al del modelo. */
  cambia: Record<CampoQueCambia, boolean>;
  color: string;
  marca: string;
  contenidoNeto: string;
  descripcion: string;
  categoria: IPalabraClave | null;
  foto: IImagenBase64 | null;
  fotoPreview: string | null;
}

/**
 * Agregar los artículos de un modelo en un solo paso (PLAN_ALTA_MODELO_Y_ARTICULOS.md, flujo A).
 *
 * Lo abren: Agregar modelo y Actualizar modelo al guardar (primero pregunta "¿Cuántos artículos
 * quieres hacer?"), la tarjeta del modelo en Catálogo → 🔍 Modelos (🧩 Productos) y Agregar artículo
 * después de sumarle stock al modelo; estos dos van directo a los formularios.
 *
 * Reglas (A3–A12 + QA 2026-10-14): cada artículo nace igual al modelo y solo cambia lo que se marca
 * en su formulario (foto, descripción, color, marca, contenido neto, categoría); talla, presentación
 * y stock son siempre de cada artículo. Cada artículo con stock ≥ 1 y la suma sin pasar del stock
 * libre del modelo, avisando mientras se escribe; se guardan todos o ninguno.
 */
@Component({
  selector: 'app-alta-articulos',
  templateUrl: './alta-articulos.component.html',
  styleUrls: ['./alta-articulos.component.scss']
})
export class AltaArticulosComponent implements OnInit {

  @Input() modelo!: ModeloParaArticulos;
  /** true: primero pregunta cuántos artículos quiere hacer (Agregar y Actualizar modelo). */
  @Input() preguntarPrimero = false;
  /** Solo cambia el título de la pregunta: "Modelo guardado" o "Modelo actualizado". */
  @Input() accion: 'alta' | 'actualizar' = 'alta';
  /** true si se guardaron artículos. */
  @Output() cerrar = new EventEmitter<boolean>();

  /** Los checks de cada artículo, en el orden en que se ven. */
  readonly camposQueCambian: { campo: CampoQueCambia; etiqueta: string }[] = [
    { campo: 'foto',          etiqueta: 'Foto' },
    { campo: 'descripcion',   etiqueta: 'Descripción' },
    { campo: 'color',         etiqueta: 'Color' },
    { campo: 'marca',         etiqueta: 'Marca' },
    { campo: 'contenidoNeto', etiqueta: 'Contenido neto' },
    { campo: 'categoria',     etiqueta: 'Categoría' }
  ];

  paso: 'pregunta' | 'formularios' = 'formularios';
  cantidad = 1;
  mismoStock: number | null = null;
  formularios: FormArticulo[] = [];
  guardando = false;
  error = '';

  constructor(private readonly varianteService: VarianteService) {}

  ngOnInit(): void {
    this.paso = this.preguntarPrimero ? 'pregunta' : 'formularios';
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
      && !this.faltaStock && this.teQuedan >= 0 && !this.hayCambioSinLlenar;
  }

  // ── Pregunta inicial: ¿cuántos artículos? ────────────────────────────

  get tituloPregunta(): string {
    return this.accion === 'actualizar' ? '✅ Producto actualizado' : '✅ Producto guardado';
  }

  continuar(): void {
    if (this.cantidadFueraDeRango) return;
    this.ajustarFormularios();
    this.paso = 'formularios';
  }

  despues(): void {
    this.cerrar.emit(false);
  }

  // ── Cuántos ──────────────────────────────────────────────────────────

  /**
   * Mismos formularios de antes; se agregan o quitan al final para no perder lo que ya se llenó.
   * Hasta 3 artículos salen abiertos; si son más, los nuevos salen plegados (el primero siempre abierto).
   */
  ajustarFormularios(): void {
    const n = Math.max(0, Math.min(Math.floor(Number(this.cantidad) || 0), this.libre));
    while (this.formularios.length < n) {
      this.formularios.push(this.nuevoFormulario(n <= AltaArticulosComponent.ABIERTOS_HASTA || this.formularios.length === 0));
    }
    this.formularios.length = n;
  }

  private static readonly ABIERTOS_HASTA = 3;

  get cantidadFueraDeRango(): boolean {
    const n = Number(this.cantidad) || 0;
    return !Number.isInteger(n) || n < 1 || n > this.libre;
  }

  private nuevoFormulario(abierto: boolean): FormArticulo {
    return {
      abierto,
      talla: '',
      presentacion: '',
      stock: this.mismoStock,
      cambia: { foto: false, descripcion: false, color: false, marca: false, contenidoNeto: false, categoria: false },
      color: '',
      marca: '',
      contenidoNeto: '',
      descripcion: '',
      categoria: null,
      foto: null,
      fotoPreview: null
    };
  }

  aplicarMismoStock(): void {
    const s = Number(this.mismoStock);
    if (!(s >= 1)) return;
    this.formularios.forEach(f => f.stock = s);
  }

  // ── Lo que cambia en cada artículo ───────────────────────────────────

  /** Lo que tiene el modelo en ese campo, para mostrarlo junto al check. */
  delModelo(campo: CampoQueCambia): string {
    const m = this.modelo;
    switch (campo) {
      case 'foto':          return m.tieneImagen ? 'la del producto' : '';
      case 'descripcion':   return (m.descripcion ?? '').trim();
      case 'color':         return (m.color ?? '').trim();
      case 'marca':         return (m.marca ?? '').trim();
      case 'contenidoNeto': return (m.contenido ?? '').trim();
      case 'categoria':     return m.categoria?.nombre ?? '';
    }
  }

  /** Al marcar, el campo aparece lleno con lo del modelo para cambiar solo lo necesario. */
  alMarcar(f: FormArticulo, campo: CampoQueCambia): void {
    if (!f.cambia[campo]) return;
    if (campo === 'categoria') {
      f.categoria = f.categoria ?? this.modelo.categoria ?? null;
    } else if (campo !== 'foto' && !f[campo]) {
      f[campo] = this.delModelo(campo);
    }
  }

  /** Marcado pero vacío: no hay cambio que guardar (y el back pondría el del modelo). */
  sinLlenar(f: FormArticulo, campo: CampoQueCambia): boolean {
    if (!f.cambia[campo]) return false;
    if (campo === 'foto') return !f.foto;
    if (campo === 'categoria') return !f.categoria;
    return !f[campo].trim();
  }

  get hayCambioSinLlenar(): boolean {
    return this.formularios.some(f => this.camposQueCambian.some(c => this.sinLlenar(f, c.campo)));
  }

  /** "Igual al modelo: Color: negro · Marca: Nike" — lo que no se marcó en ese artículo. */
  igualAlModelo(f: FormArticulo): string {
    return this.camposQueCambian
      .filter(c => !f.cambia[c.campo])
      .map(c => `${c.etiqueta}: ${this.delModelo(c.campo) || '(el producto no tiene)'}`)
      .join(' · ');
  }

  // ── Plegar y desplegar ───────────────────────────────────────────────

  /** "Talla S · Stock 1 · Cambia: Descripción" — lo que se ve con el artículo plegado. */
  resumen(f: FormArticulo): string {
    const partes: string[] = [];
    if (f.talla.trim()) partes.push(`Talla ${f.talla.trim()}`);
    if (f.stock !== null && f.stock !== undefined && String(f.stock) !== '') partes.push(`Stock ${f.stock}`);
    const cambia = this.camposQueCambian.filter(c => f.cambia[c.campo]).map(c => c.etiqueta);
    partes.push(cambia.length ? `Cambia: ${cambia.join(', ')}` : 'Igual al producto');
    return partes.join(' · ');
  }

  /** Lo que le falta para poder guardar ("stock", "Color"…). Vacío = está completo. */
  pendientes(f: FormArticulo): string[] {
    const falta: string[] = [];
    if (f.stock === null || f.stock === undefined || String(f.stock) === '' || this.stockInvalido(f)) falta.push('stock');
    for (const c of this.camposQueCambian) {
      if (this.sinLlenar(f, c.campo)) falta.push(c.etiqueta);
    }
    return falta;
  }

  /** Números de los artículos a los que les falta algo (1, 2, 3…). */
  get articulosConPendientes(): number[] {
    return this.formularios.map((f, i) => (this.pendientes(f).length ? i + 1 : 0)).filter(n => n > 0);
  }

  /** "Al artículo 3 le falta algo." · "A los artículos 2, 5 y 7 les falta algo." · "…2, 3, 4, 5, 6, 7 y 13 más…" */
  get textoPendientes(): string {
    const nums = this.articulosConPendientes;
    if (nums.length === 1) return `Al artículo ${nums[0]} le falta algo.`;
    if (nums.length === this.formularios.length && nums.length > 3) return 'A todos los artículos les falta algo.';
    const lista = nums.length <= 7
      ? `${nums.slice(0, -1).join(', ')} y ${nums[nums.length - 1]}`
      : `${nums.slice(0, 6).join(', ')} y ${nums.length - 6} más`;
    return `A los artículos ${lista} les falta algo.`;
  }

  get todosAbiertos(): boolean {
    return this.formularios.every(f => f.abierto);
  }

  get todosCerrados(): boolean {
    return this.formularios.every(f => !f.abierto);
  }

  abrirTodos(abrir: boolean): void {
    this.formularios.forEach(f => f.abierto = abrir);
  }

  /** Abre los que tienen algo pendiente y pliega los que ya están completos. */
  abrirPendientes(): void {
    this.formularios.forEach(f => f.abierto = this.pendientes(f).length > 0);
  }

  /** Sin foto propia y sin foto del modelo, el artículo no sale en la tienda. */
  quedaSinFoto(f: FormArticulo): boolean {
    return f.cambia.foto ? !f.foto : !this.modelo.tieneImagen;
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
    // Lo no marcado viaja vacío y el back lo llena con el del modelo (R2/R3 del dominio `articulo`).
    const texto = (f: FormArticulo, campo: CampoDeTexto) => (f.cambia[campo] ? f[campo].trim() : '');
    const payload: IVarianteRequest[] = this.formularios.map(f => ({
      productoId: this.modelo.id,
      talla: f.talla.trim(),
      color: texto(f, 'color'),
      marca: texto(f, 'marca'),
      presentacion: f.presentacion.trim(),
      contenidoNeto: texto(f, 'contenidoNeto'),
      descripcion: texto(f, 'descripcion'),
      stock: Number(f.stock),
      palabraClaveId: f.cambia.categoria ? (f.categoria?.id ?? null) : null,
      listImagenes: f.cambia.foto && f.foto ? [f.foto] : [],
      // Cada formulario se queda con su foto; si no la cambió, usa la del modelo (A8).
      imagenesPropias: true,
      usarImagenDelModelo: this.modelo.tieneImagen && !f.cambia.foto
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
