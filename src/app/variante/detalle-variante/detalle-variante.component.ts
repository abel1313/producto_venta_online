import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { IVarianteDto, IVarianteImagenDto, IVarianteResumen } from '../models/variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { IIndependizarRequest, VarianteService } from '../service/variante.service';
import { ProductoService } from 'src/app/productos/service/producto.service';

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
  indepForm = {
    nombre: '',
    descripcion: '',
    marca: '',
    color: '',
    contenido: '',
    precioCosto: 0,
    precioVenta: 0,
    precioRebaja: 0,
    palabraClaveId: null as number | null,
    codigoBarras: '',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly varianteService: VarianteService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly authService: AuthService,
    private readonly productoService: ProductoService,
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    const params = this.route.snapshot.paramMap;
    const productoIdParam = params.get('productoId');
    const varianteIdParam = params.get('id');

    const productoId$ = productoIdParam
      ? of(+productoIdParam)
      : this.varianteService.getOne(+varianteIdParam!).pipe(
          switchMap(v => of(v.producto?.id!))
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
      },
      error: () => {}
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
      background: '#1e1b4b',
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
          Swal.fire({ icon: 'success', title: 'Imágenes eliminadas', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        },
        error: () => {
          this.eliminando = false;
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        }
      });
    });
  }

  volver(): void { this.router.navigate(['/variantes/buscar']); }

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
        this.indepForm = {
          nombre:        p?.nombre ?? '',
          descripcion:   v.descripcion ?? p?.descripcion ?? '',
          marca:         v.marca ?? p?.marca ?? '',
          color:         v.color ?? p?.color ?? '',
          contenido:     v.contenidoNeto ?? p?.contenido ?? '',
          precioCosto:   p?.precioCosto ?? 0,
          precioVenta:   p?.precioVenta ?? v.precio ?? 0,
          precioRebaja:  p?.precioRebaja ?? 0,
          palabraClaveId: (v as any).palabraClave?.id ?? p?.palabraClave?.id ?? null,
          codigoBarras:  '',
        };
        this.cargandoIndependizar = false;
        this.mostrarModalIndependizar = true;
      },
      error: () => {
        // Si falla el fetch, abrir igualmente con los datos de la variante
        this.indepForm = {
          nombre:        '',
          descripcion:   v.descripcion ?? '',
          marca:         v.marca ?? '',
          color:         v.color ?? '',
          contenido:     v.contenidoNeto ?? '',
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
            this.router.navigate(['/variantes/buscar']);
          } else {
            // Quitar la variante independizada de la lista y actualizar vista
            this.variantes = this.variantes.filter(v => v.id !== this.varianteSeleccionada!.id);
            if (this.variantes.length > 0) {
              this.seleccionar(this.variantes[0]);
            } else {
              this.router.navigate(['/variantes/buscar']);
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
}
