import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { IVarianteDto, IVarianteImagenDto, IVarianteResumen } from '../models/variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { IIndependizarRequest, VarianteService } from '../service/variante.service';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';
import { ResenaService } from 'src/app/resenas/service/resena.service';
import { IResena, IResenaResumen } from 'src/app/resenas/models/resena.model';

const PAGE_SIZE = 4;

@Component({
  selector: 'app-detalle-variante',
  templateUrl: './detalle-variante.component.html',
  styleUrls: ['./detalle-variante.component.scss']
})
export class DetalleVarianteComponent implements OnInit {

  productoId!: number;
  variantes: IVarianteDto[] = [];
  varianteSeleccionada: IVarianteDto | null = null;

  displayImages: IVarianteImagenDto[] = [];
  private paginasCargadas = new Set<number>();
  private cargaInicialCompletada = false;
  totalPaginas = 0;

  // ── Eliminación de imágenes (solo admin) ──────────────────────────
  isAdminUser = false;
  private roles: string[] = [];
  get isAnonymous(): boolean { return !this.roles || this.roles.length === 0; }
  imagenesParaEliminar = new Set<string>();
  eliminando = false;

  get totalMarcadas(): number { return this.imagenesParaEliminar.size; }

  responsiveOptions = [
    { breakpoint: '1400px', numVisible: 2, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '767px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '575px',  numVisible: 1, numScroll: 1 },
  ];

  // ── Modal Independizar ─────────────────────────────────────────────────────
  mostrarModalIndependizar = false;
  cargandoIndependizar = false;
  independizando = false;
  independizarError: string | null = null;
  indepStockInfo = 0;
  palabraClaveSeleccionadaIndep: IPalabraClave | null = null;
  indepForm = {
    nombre: '',
    descripcion: '',
    marca: '',
    color: '',
    contenido: '',
    piezas: 0,
    precioCosto: 0,
    precioVenta: 0,
    precioRebaja: 0,
    palabraClaveId: null as number | null,
    codigoBarras: '',
  };

  // ── Reseñas ──────────────────────────────────────────────────────────────
  resenaResumen: IResenaResumen | null = null;
  seccionResenasAbierta = false;
  resenas: IResena[] = [];
  resenasPagina = 1;
  resenasTotalPaginas = 1;
  cargandoResenas = false;
  get miResena(): IResena | null { return this.resenas.find(r => r.esPropia) ?? null; }

  /** Falla al resolver la ficha. Antes se tragaba en silencio y la pantalla quedaba en blanco. */
  errorCarga: string | null = null;

  mostrarFormResena = false;
  editandoResenaId: number | null = null;
  formCalificacion = 5;
  formComentario = '';
  guardandoResena = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly varianteService: VarianteService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly authService: AuthService,
    private readonly productoService: ProductoService,
    private readonly resenaService: ResenaService,
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    const params = this.route.snapshot.paramMap;
    const productoIdParam = params.get('productoId');
    const varianteIdParam = params.get('id');

    // El catálogo y favoritos mandan el `productoId` en la URL a propósito, para no tener que
    // preguntárselo al back: `GET /tienda/v1/getOne/{id}` pasó a ser ADMIN-only (2026-08-11,
    // devolvía la entidad cruda con `precioCosto`) y esta pantalla es pública.
    //
    // Cuando NO viene (link directo o marcador, típico link compartido por WhatsApp/Facebook)
    // se resuelve con el endpoint público `resolverProductoId`. El `getOne` queda solo como
    // respaldo mientras ese endpoint termina de desplegarse: hoy sigue funcionando para admin,
    // y para un cliente falla mostrando aviso en vez de dejar la pantalla en blanco. Una vez
    // que el resolver esté en todos los ambientes, este `catchError` se puede quitar.
    const productoIdConocido = productoIdParam ?? this.route.snapshot.queryParamMap.get('productoId');

    const productoId$ = productoIdConocido
      ? of(+productoIdConocido)
      : this.varianteService.resolverProductoId(+varianteIdParam!).pipe(
          catchError(() => this.varianteService.getOne(+varianteIdParam!).pipe(
            switchMap(v => of(v.producto?.id!))
          ))
        );

    productoId$.pipe(
      switchMap(pid => {
        this.productoId = pid;
        return this.varianteService.getPorProducto(pid);
      })
    ).subscribe({
      next: variantes => {
        this.variantes = variantes;
        const preseleccionada = varianteIdParam
          ? variantes.find(v => v.id === +varianteIdParam) ?? variantes[0]
          : variantes[0];
        if (preseleccionada) this.seleccionar(preseleccionada);
        else this.errorCarga = 'Este producto ya no está disponible.';
      },
      error: err => {
        this.errorCarga = (err?.status === 401 || err?.status === 403)
          ? 'No pudimos abrir este producto desde un enlace directo. Búscalo en la tienda para verlo.'
          : (err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cargar el producto.');
      }
    });
  }

  seleccionar(v: IVarianteDto): void {
    this.varianteSeleccionada = v;
    this.displayImages = [];
    this.paginasCargadas = new Set<number>();
    this.cargaInicialCompletada = false;
    this.totalPaginas = 0;
    this.imagenesParaEliminar.clear();

    this.varianteService.getImagenesPaginado(v.id, 1, PAGE_SIZE).subscribe({
      next: res => {
        this.displayImages = res.t ?? [];
        this.totalPaginas  = res.totalPaginas;
        this.paginasCargadas.add(1);
        this.cargaInicialCompletada = true;
      }
    });

    // Reseñas — el resumen (estrellitas) se carga siempre; el listado completo solo si el
    // usuario abre la sección, para no traer todos los comentarios de entrada.
    this.resenaResumen = null;
    this.seccionResenasAbierta = false;
    this.resenas = [];
    this.resenasPagina = 1;
    this.cerrarFormResena();
    this.resenaService.resumen(v.id).subscribe({
      next: res => { this.resenaResumen = res?.data ?? null; },
      error: () => { this.resenaResumen = null; }
    });
  }

  handlePageChange(event: any): void {
    if (!this.cargaInicialCompletada) return;
    if (this.paginasCargadas.size >= this.totalPaginas) return;

    const puntoSeleccionado = event.page + 1;

    if (!this.paginasCargadas.has(puntoSeleccionado) && puntoSeleccionado <= this.totalPaginas) {
      this.cargarPagina(puntoSeleccionado);
      return;
    }

    for (let i = 1; i <= this.totalPaginas; i++) {
      if (!this.paginasCargadas.has(i)) {
        this.cargarPagina(i);
        break;
      }
    }
  }

  private cargarPagina(pagina: number): void {
    if (this.paginasCargadas.has(pagina) || !this.varianteSeleccionada) return;
    this.paginasCargadas.add(pagina);

    this.varianteService.getImagenesPaginado(this.varianteSeleccionada.id, pagina, PAGE_SIZE).subscribe({
      next: res => {
        const nuevas = (res.t ?? []).filter(
          n => !this.displayImages.some(e => e.id === n.id)
        );
        this.displayImages = [...this.displayImages, ...nuevas];
      },
      error: () => { this.paginasCargadas.delete(pagina); }
    });
  }

  imageSrc(img: IVarianteImagenDto): string {
    if (img?.urlImagen) return img.urlImagen;
    if (!img?.base64) return '';
    if (img.base64.startsWith('data:')) return img.base64;
    return `data:${img.extension};base64,${img.base64.replace(/\s+/g, '')}`;
  }

  get variantesChips(): IVarianteDto[] {
    const seen = new Set<string>();
    return this.variantes.filter(v => {
      const key = `${v.talla ?? ''}|${v.color ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ── Carrito ────────────────────────────────────────────────────────────────

  private toResumen(): IVarianteResumen {
    return {
      id:            this.varianteSeleccionada!.id,
      talla:         this.varianteSeleccionada!.talla,
      color:         this.varianteSeleccionada!.color,
      marca:         this.varianteSeleccionada!.marca,
      presentacion:  this.varianteSeleccionada!.presentacion,
      stock:         this.varianteSeleccionada!.stock,
      descripcion:   this.varianteSeleccionada!.descripcion,
      contenidoNeto: this.varianteSeleccionada!.contenidoNeto,
      precio:        this.varianteSeleccionada!.precio,
      codigoBarras:  this.varianteSeleccionada!.codigoBarras,
    };
  }

  agregarCarrito(): void {
    if (!this.varianteSeleccionada) return;
    this.carritoVariante.agregar(this.toResumen());
  }

  quitarCarrito(): void {
    if (!this.varianteSeleccionada?.id) return;
    this.carritoVariante.eliminar(this.varianteSeleccionada.id);
  }

  get estaEnCarrito(): boolean {
    return this.varianteSeleccionada?.id
      ? this.carritoVariante.estaEnCarrito(this.varianteSeleccionada.id)
      : false;
  }

  get cantidadEnCarrito(): number {
    return this.varianteSeleccionada?.id
      ? this.carritoVariante.cantidadEnCarrito(this.varianteSeleccionada.id)
      : 0;
  }

  get stockAgotado(): boolean {
    const stock = this.varianteSeleccionada?.stock ?? 0;
    return stock === 0 || this.cantidadEnCarrito >= stock;
  }

  get colorGradient(): string {
    const map: Record<string, string> = {
      negro:    'linear-gradient(135deg,#424242,#616161)',
      azul:     'linear-gradient(135deg,#1e88e5,#42a5f5)',
      rojo:     'linear-gradient(135deg,#e53935,#ef5350)',
      blanco:   'linear-gradient(135deg,#78909c,#90a4ae)',
      verde:    'linear-gradient(135deg,#43a047,#66bb6a)',
      amarillo: 'linear-gradient(135deg,#fb8c00,#ffa726)',
      gris:     'linear-gradient(135deg,#546e7a,#78909c)',
      rosa:     'linear-gradient(135deg,#e91e63,#f06292)',
      morado:   'linear-gradient(135deg,#7b1fa2,#ab47bc)',
      naranja:  'linear-gradient(135deg,#f4511e,#ff7043)',
      cafe:     'linear-gradient(135deg,#6d4c41,#8d6e63)',
      beige:    'linear-gradient(135deg,#8d6e63,#a1887f)',
      turquesa: 'linear-gradient(135deg,#00897b,#26a69a)',
      celeste:  'linear-gradient(135deg,#039be5,#29b6f6)',
    };
    return map[(this.varianteSeleccionada?.color ?? '').toLowerCase().trim()]
      ?? 'linear-gradient(135deg,#5c6bc0,#7986cb)';
  }

  // ── Eliminación de imágenes ────────────────────────────────────────

  toggleMarcar(img: IVarianteImagenDto): void {
    if (!img.id) return;
    if (this.imagenesParaEliminar.has(img.id)) {
      this.imagenesParaEliminar.delete(img.id);
    } else {
      this.imagenesParaEliminar.add(img.id);
    }
  }

  estaMarcada(img: IVarianteImagenDto): boolean {
    return !!img.id && this.imagenesParaEliminar.has(img.id);
  }

  confirmarEliminar(): void {
    if (!this.varianteSeleccionada || this.imagenesParaEliminar.size === 0) return;

    Swal.fire({
      title: `¿Eliminar ${this.imagenesParaEliminar.size} imagen(es)?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#0F2A20',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.eliminando = true;
      const ids = Array.from(this.imagenesParaEliminar);

      this.varianteService.eliminarImagenesV2(this.varianteSeleccionada!.id, ids).subscribe({
        next: () => {
          this.displayImages = this.displayImages.filter(img => !img.id || !this.imagenesParaEliminar.has(img.id));
          this.imagenesParaEliminar.clear();
          this.eliminando = false;
          Swal.fire({ icon: 'success', title: 'Imágenes eliminadas', timer: 1500, showConfirmButton: false, background: '#0F2A20', color: '#fff' });
        },
        error: () => {
          this.eliminando = false;
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#0F2A20', color: '#fff' });
        }
      });
    });
  }

  volver(): void { this.router.navigate(['/tienda/buscar']); }

  // ── Independizar variante ──────────────────────────────────────────────────

  abrirIndependizar(): void {
    if (!this.varianteSeleccionada || this.cargandoIndependizar) return;
    const v = this.varianteSeleccionada;

    this.indepStockInfo = v.stock;
    this.independizarError = null;
    this.cargandoIndependizar = true;

    // Primero cargar producto — solo abrir el modal cuando todos los datos estén listos
    this.productoService.getDataGeneric<any>(this.productoId).subscribe({
      next: (res: any) => {
        const p = res?.data ?? res;
        const pkVariante = (v as any).palabraClave ?? null;
        const pkProducto = p?.palabraClave ?? null;
        const pk: IPalabraClave | null = pkVariante ?? pkProducto ?? null;
        this.palabraClaveSeleccionadaIndep = pk;
        this.indepForm = {
          nombre:        p?.nombre ?? '',
          descripcion:   v.descripcion ?? p?.descripcion ?? '',
          marca:         v.marca ?? p?.marca ?? '',
          color:         v.color ?? p?.color ?? '',
          contenido:     v.contenidoNeto ?? p?.contenido ?? '',
          piezas:        p?.piezas ?? 0,
          precioCosto:   p?.precioCosto ?? 0,
          precioVenta:   p?.precioVenta ?? v.precio ?? 0,
          precioRebaja:  p?.precioRebaja ?? 0,
          palabraClaveId: pk?.id ?? null,
          codigoBarras:  '',
        };
        this.cargandoIndependizar = false;
        this.mostrarModalIndependizar = true;
      },
      error: () => {
        this.palabraClaveSeleccionadaIndep = null;
        this.indepForm = {
          nombre:        '',
          descripcion:   v.descripcion ?? '',
          marca:         v.marca ?? '',
          color:         v.color ?? '',
          contenido:     v.contenidoNeto ?? '',
          piezas:        0,
          precioCosto:   0,
          precioVenta:   v.precio ?? 0,
          precioRebaja:  0,
          palabraClaveId: null,
          codigoBarras:  '',
        };
        this.cargandoIndependizar = false;
        this.mostrarModalIndependizar = true;
      }
    });
  }

  cerrarIndependizar(): void {
    if (this.independizando) return;
    this.mostrarModalIndependizar = false;
    this.independizarError = null;
    this.palabraClaveSeleccionadaIndep = null;
  }

  onPalabraClaveIndep(pk: IPalabraClave | null): void {
    this.indepForm.palabraClaveId = pk?.id ?? null;
  }

  confirmarIndependizar(): void {
    if (!this.varianteSeleccionada || this.independizando) return;
    if (!this.indepForm.nombre.trim()) {
      this.independizarError = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!this.indepForm.codigoBarras.trim()) {
      this.independizarError = 'El código de barras es obligatorio.';
      return;
    }

    this.independizando = true;
    this.independizarError = null;

    const body: IIndependizarRequest = {
      nombre:        this.indepForm.nombre.trim(),
      descripcion:   this.indepForm.descripcion || undefined,
      marca:         this.indepForm.marca || undefined,
      color:         this.indepForm.color || undefined,
      contenido:     this.indepForm.contenido || undefined,
      piezas:        this.indepForm.piezas || undefined,
      precioCosto:   this.indepForm.precioCosto,
      precioVenta:   this.indepForm.precioVenta,
      precioRebaja:  this.indepForm.precioRebaja || undefined,
      palabraClaveId: this.indepForm.palabraClaveId,
      codigoBarras:  this.indepForm.codigoBarras.trim(),
    };

    this.varianteService.independizar(this.varianteSeleccionada.id, body).subscribe({
      next: (res) => {
        this.independizando = false;
        this.mostrarModalIndependizar = false;
        const d = res.data;
        Swal.fire({
          icon: 'success',
          title: '✅ Variante independizada',
          html: `Producto nuevo creado con ID <strong>#${d.productoNuevoId}</strong><br>
                 Código: <strong>${d.codigoBarras}</strong><br>
                 Stock restante del producto origen: <strong>${d.stockProductoOrigenRestante}</strong>`,
          showCancelButton: true,
          confirmButtonText: '🔍 Ver variantes',
          cancelButtonText: 'Cerrar',
        }).then(result => {
          if (result.isConfirmed) {
            this.router.navigate(['/tienda/buscar']);
          } else {
            // Quitar la variante independizada de la lista y actualizar vista
            this.variantes = this.variantes.filter(v => v.id !== this.varianteSeleccionada!.id);
            if (this.variantes.length > 0) {
              this.seleccionar(this.variantes[0]);
            } else {
              this.router.navigate(['/tienda/buscar']);
            }
          }
        });
      },
      error: (err) => {
        this.independizando = false;
        this.independizarError = err?.error?.mensaje ?? 'No se pudo independizar la variante.';
      }
    });
  }

  // ── Reseñas ──────────────────────────────────────────────────────────────

  toggleSeccionResenas(): void {
    this.seccionResenasAbierta = !this.seccionResenasAbierta;
    if (this.seccionResenasAbierta && this.resenas.length === 0) {
      this.cargarResenas(1);
    }
  }

  cargarResenas(pagina: number): void {
    if (!this.varianteSeleccionada) return;
    this.cargandoResenas = true;
    this.resenaService.listarPorVariante(this.varianteSeleccionada.id, pagina, 10).subscribe({
      next: res => {
        this.resenas = res?.data?.t ?? [];
        this.resenasTotalPaginas = res?.data?.totalPaginas ?? 1;
        this.resenasPagina = pagina;
        this.cargandoResenas = false;
      },
      error: () => { this.cargandoResenas = false; }
    });
  }

  anteriorPaginaResenas(): void {
    if (this.resenasPagina > 1) this.cargarResenas(this.resenasPagina - 1);
  }

  siguientePaginaResenas(): void {
    if (this.resenasPagina < this.resenasTotalPaginas) this.cargarResenas(this.resenasPagina + 1);
  }

  estrellas(n: number): number[] {
    const redondeado = Math.round(n);
    return Array(5).fill(0).map((_, i) => i < redondeado ? 1 : 0);
  }

  abrirFormResena(existente?: IResena): void {
    this.editandoResenaId = existente?.id ?? null;
    this.formCalificacion = existente?.calificacion ?? 5;
    this.formComentario   = existente?.comentario ?? '';
    this.mostrarFormResena = true;
  }

  cerrarFormResena(): void {
    this.mostrarFormResena = false;
    this.editandoResenaId = null;
    this.formCalificacion = 5;
    this.formComentario = '';
  }

  guardarResena(): void {
    if (!this.varianteSeleccionada || this.guardandoResena) return;
    this.guardandoResena = true;

    const obs = this.editandoResenaId
      ? this.resenaService.editar(this.editandoResenaId, this.formCalificacion, this.formComentario)
      : this.resenaService.crear(this.varianteSeleccionada.id, this.formCalificacion, this.formComentario);

    obs.subscribe({
      next: () => {
        this.guardandoResena = false;
        this.cerrarFormResena();
        this.cargarResenas(1);
        this.resenaService.resumen(this.varianteSeleccionada!.id).subscribe({
          next: res => { this.resenaResumen = res?.data ?? null; },
          error: () => {}
        });
      },
      error: (err) => {
        this.guardandoResena = false;
        Swal.fire({ icon: 'error', title: 'No se pudo guardar tu reseña', text: err?.error?.mensaje ?? 'Intenta de nuevo.' });
      }
    });
  }

  eliminarResena(r: IResena): void {
    Swal.fire({
      title: '¿Eliminar reseña?',
      text: r.esPropia ? 'Esta acción no se puede deshacer.' : `Se eliminará la reseña de ${r.nombreCliente}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.resenaService.eliminar(r.id).subscribe({
        next: () => {
          this.resenas = this.resenas.filter(x => x.id !== r.id);
          if (this.varianteSeleccionada) {
            this.resenaService.resumen(this.varianteSeleccionada.id).subscribe({
              next: res => { this.resenaResumen = res?.data ?? null; },
              error: () => {}
            });
          }
        },
        error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo eliminar la reseña.' })
      });
    });
  }
}
