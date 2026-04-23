import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { IDetalleProducto } from 'src/app/models';
import { CarritoService } from 'src/app/services/carrito/carrito.service';
import Swal from 'sweetalert2';
import { IVariante } from '../models/variante.model';
import { VarianteService } from '../service/variante.service';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.scss']
})
export class BuscarComponent implements OnInit {

  variantes: IVariante[] = [];
  paginaActual  = 1;
  totalPaginas  = 0;
  terminoBusqueda = '';
  buscando = false;
  isAdminUser = false;
  detalle: IDetalleProducto[] = [];

  private busquedaSubject = new Subject<string>();

  constructor(
    private readonly varianteService: VarianteService,
    private readonly authService: AuthService,
    private readonly carritoService: CarritoService,
    readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    this.carritoService.carritoDetalle$.subscribe(d => {
      this.detalle = d;
    });

    this.busquedaSubject.pipe(
      debounceTime(400)
    ).subscribe((termino: string) => this.buscarPagina(termino, 1));

    if (this.varianteService.initialized) {
      this.variantes    = [...this.varianteService.variantesCache];
      this.totalPaginas = this.varianteService.totalPaginasCache;
      this.paginaActual = this.varianteService.paginaCache;
      return;
    }

    this.buscarPagina('', 1);
  }

  // ── Búsqueda ───────────────────────────────────────────────────────

  onBuscar(event: KeyboardEvent): void {
    const termino = (event.target as HTMLInputElement).value;
    this.terminoBusqueda = termino;

    if (termino.length === 0) {
      this.buscarPagina('', 1);
      return;
    }
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

  // ── Paginación ─────────────────────────────────────────────────────

  anteriorPagina(): void {
    if (this.paginaActual > 1) this.buscarPagina(this.terminoBusqueda, this.paginaActual - 1);
  }

  siguientePagina(): void {
    if (this.paginaActual < this.totalPaginas) this.buscarPagina(this.terminoBusqueda, this.paginaActual + 1);
  }

  // ── Carrito ────────────────────────────────────────────────────────

  agregarCarrito(v: IVariante): void {
    const prod: IDetalleProducto = {
      idProducto:   v.producto?.id ?? 0,
      nombre:       this.labelVariante(v),
      descripcion:  `Talla: ${v.talla ?? '-'} | Color: ${v.color ?? '-'} | Marca: ${v.marca ?? '-'}`,
      stock:        v.stock ?? 0,
      precioVenta:  v.producto?.precioVenta ?? 0,
      codigoBarras: String(v.id ?? ''),
      cantidad:     1,
      total:        v.producto?.precioVenta ?? 0
    };
    const ok = this.carritoService.agregarProducto(prod);
    if (!ok) {
      Swal.fire({
        icon: 'warning', title: 'Sin stock',
        text: `No hay más unidades de "${prod.nombre}".`,
        confirmButtonColor: '#3085d6', timer: 2500, showConfirmButton: false
      });
    }
  }

  eliminarCarrito(v: IVariante): void {
    const found = this.detalle.find(d => d.codigoBarras === String(v.id));
    if (found) this.carritoService.eliminarProducto(found);
  }

  verCarrito(): void {
    this.router.navigate(['/productos/detalle-productos']);
  }

  editarVariante(v: IVariante): void {
    this.varianteService.setVarianteUpdate(v);
    this.router.navigate(['/variantes/update']);
  }

  estaEnCarrito(v: IVariante): boolean {
    return this.detalle.some(d => d.codigoBarras === String(v.id));
  }

  cantidadEnCarrito(v: IVariante): number {
    return this.detalle.find(d => d.codigoBarras === String(v.id))?.cantidad ?? 0;
  }

  stockAgotado(v: IVariante): boolean {
    const stock = v.stock ?? 0;
    return stock === 0 || this.cantidadEnCarrito(v) >= stock;
  }

  get totalEnCarrito(): number {
    return this.detalle.reduce((s, d) => s + d.cantidad, 0);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  labelVariante(v: IVariante): string {
    return [v.producto?.nombre, v.talla, v.color].filter(Boolean).join(' · ');
  }

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
}
