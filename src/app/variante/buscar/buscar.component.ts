import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IVarianteResumen } from '../models/variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { VarianteService } from '../service/variante.service';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.scss']
})
export class BuscarComponent implements OnInit {

  variantes: IVarianteResumen[] = [];
  paginaActual    = 1;
  totalPaginas    = 0;
  terminoBusqueda = '';
  buscando        = false;
  isAdminUser     = false;
  detalle: IDetalleVariante[] = [];

  private productoId = 0;
  private busquedaSubject = new Subject<string>();

  constructor(
    private readonly varianteService: VarianteService,
    private readonly authService: AuthService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly route: ActivatedRoute,
    readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    this.carritoVariante.carrito$.subscribe(d => { this.detalle = d; });

    this.busquedaSubject.pipe(debounceTime(400))
      .subscribe((termino: string) => this.buscarPagina(termino, 1));

    this.route.queryParams.subscribe(params => {
      this.productoId = Number(params['productoId']) || 0;
      if (this.productoId > 0) {
        this.cargarResumen(1);
      } else {
        if (this.varianteService.initialized) {
          this.variantes    = [...this.varianteService.variantesCache];
          this.totalPaginas = this.varianteService.totalPaginasCache;
          this.paginaActual = this.varianteService.paginaCache;
        } else {
          this.buscarPagina('', 1);
        }
      }
    });
  }

  // ── Búsqueda ───────────────────────────────────────────────────────

  onBuscar(event: KeyboardEvent): void {
    const termino = (event.target as HTMLInputElement).value;
    this.terminoBusqueda = termino;
    if (termino.length === 0) { this.buscarPagina('', 1); return; }
    if (termino.length < 3) return;
    this.busquedaSubject.next(termino);
  }

  private buscarPagina(termino: string, pagina: number): void {
    this.buscando = true;
    const esCodigoBarras = termino.length > 0 && /^\d+$/.test(termino);
    const params = esCodigoBarras
      ? { codigoBarras: termino, pagina, size: 10 }
      : { nombre: termino,      pagina, size: 10 };

    this.varianteService.buscar(params).subscribe({
      next: res => {
        this.variantes    = res.t ?? [];
        this.totalPaginas = res.totalPaginas;
        this.paginaActual = pagina;
        if (termino === '') this.varianteService.setCache(res.t ?? [], pagina, res.totalPaginas);
        this.buscando = false;
      },
      error: () => { this.buscando = false; }
    });
  }

  private cargarResumen(pagina: number): void {
    this.buscando = true;
    this.varianteService.getPorProductoPaginadoResumen(this.productoId, pagina, 10).subscribe({
      next: res => {
        this.variantes    = res.t ?? [];
        this.totalPaginas = res.totalPaginas;
        this.paginaActual = pagina;
        this.buscando = false;
      },
      error: () => { this.buscando = false; }
    });
  }

  // ── Paginación ─────────────────────────────────────────────────────

  anteriorPagina(): void {
    if (this.paginaActual <= 1) return;
    if (this.productoId > 0) this.cargarResumen(this.paginaActual - 1);
    else this.buscarPagina(this.terminoBusqueda, this.paginaActual - 1);
  }

  siguientePagina(): void {
    if (this.paginaActual >= this.totalPaginas) return;
    if (this.productoId > 0) this.cargarResumen(this.paginaActual + 1);
    else this.buscarPagina(this.terminoBusqueda, this.paginaActual + 1);
  }

  // ── Carrito variante ───────────────────────────────────────────────

  agregarCarrito(v: IVarianteResumen): void {
    const ok = this.carritoVariante.agregar(v);
    if (!ok) {
      Swal.fire({
        icon: 'warning', title: 'Sin stock',
        text: `No hay más unidades disponibles.`,
        confirmButtonColor: '#3085d6', timer: 2000, showConfirmButton: false
      });
    }
  }

  eliminarCarrito(v: IVarianteResumen): void {
    this.carritoVariante.eliminar(v.id);
  }

  verCarrito(): void {
    this.router.navigate(['/variantes/carrito']);
  }

  editarVariante(v: IVarianteResumen): void {
    this.varianteService.getOne(v.id).subscribe({
      next: variante => {
        this.varianteService.setVarianteUpdate(variante);
        this.router.navigate(['/variantes/update']);
      },
      error: () => {
        // Si falla, navega con los datos que tenemos
        this.varianteService.setVarianteUpdate({ id: v.id, talla: v.talla, color: v.color,
          marca: v.marca, presentacion: v.presentacion, stock: v.stock, descripcion: v.descripcion,
          contenidoNeto: v.contenidoNeto } as any);
        this.router.navigate(['/variantes/update']);
      }
    });
  }

  estaEnCarrito(v: IVarianteResumen): boolean {
    return this.carritoVariante.estaEnCarrito(v.id);
  }

  cantidadEnCarrito(v: IVarianteResumen): number {
    return this.carritoVariante.cantidadEnCarrito(v.id);
  }

  stockAgotado(v: IVarianteResumen): boolean {
    const stock = v.stock ?? 0;
    return stock === 0 || this.cantidadEnCarrito(v) >= stock;
  }

  get totalEnCarrito(): number {
    return this.carritoVariante.total;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  colorHeader(color: string): string {
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
    return map[(color ?? '').toLowerCase().trim()]
      ?? 'linear-gradient(135deg,#5c6bc0,#7986cb)';
  }

  stockClase(stock: number): string {
    if (stock === 0) return 'badge bg-danger';
    if (stock <= 3)  return 'badge bg-warning text-dark';
    return 'badge bg-success';
  }

  imageSrc(base64: string | null | undefined): string | null {
    if (!base64) return null;
    if (base64.startsWith('data:')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  }
}
