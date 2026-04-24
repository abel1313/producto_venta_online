import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { IVarianteDto, IVarianteImagenDto, IVarianteResumen } from '../models/variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { VarianteService } from '../service/variante.service';

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
  cargando = true;

  displayImages: IVarianteImagenDto[] = [];
  private paginasCargadas = new Set<number>();
  private cargaInicialCompletada = false;
  totalPaginas = 0;

  responsiveOptions = [
    { breakpoint: '1400px', numVisible: 2, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '767px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '575px',  numVisible: 1, numScroll: 1 },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly varianteService: VarianteService,
    private readonly carritoVariante: CarritoVarianteService,
  ) {}

  ngOnInit(): void {
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
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  seleccionar(v: IVarianteDto): void {
    this.varianteSeleccionada = v;
    this.displayImages = [];
    this.paginasCargadas = new Set<number>();
    this.cargaInicialCompletada = false;
    this.totalPaginas = 0;

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
    if (!img?.base64) return '';
    if (img.base64.startsWith('data:')) return img.base64;
    return `data:${img.extension};base64,${img.base64}`;
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

  volver(): void { this.router.navigate(['/variantes/buscar']); }
}
