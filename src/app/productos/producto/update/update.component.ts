import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ImagenUpdateDto } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTORec } from '../models/producto.dto.model';
import { ProductoImagenPaginadaDto } from '../models/ProductoImagenDto.model';
import Swal from 'sweetalert2';

const PAGE_SIZE = 8;

export interface ImagenVista {
  dto:      ImagenUpdateDto;
  src:      SafeUrl | string;
  cargando: boolean;
  error:    boolean;
}

@Component({
  selector:    'app-update',
  templateUrl: './update.component.html',
  styleUrls:   ['./update.component.scss']
})
export class UpdateComponent implements OnInit, OnDestroy {

  productoActualizar: IProductoDTORec | null = null;

  displayImages:          ImagenVista[] = [];
  cargandoImagenes        = false;
  eliminando              = new Set<string>();
  cambiandoPrincipal      = new Set<string>();

  private paginasCargadas         = new Set<number>();
  private cargaInicialCompletada  = false;
  totalPaginas                    = 0;
  private objectUrls: string[]    = [];
  private idProductoCargado: number | null = null;
  private destroy$                = new Subject<void>();

  responsiveOptions = [
    { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '767px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '575px',  numVisible: 1, numScroll: 1 },
  ];

  constructor(
    private readonly serviceProducto: ProductoService,
    private readonly router:          Router,
    private readonly sanitizer:       DomSanitizer,
  ) {}

  volver(): void { this.router.navigate(['/productos/buscar']); }

  ngOnInit(): void {
    this.serviceProducto.productoUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(producto => {
        this.productoActualizar = producto as IProductoDTORec | null;
        const nuevoId = producto?.idProducto ?? null;
        if (nuevoId && nuevoId !== this.idProductoCargado) {
          this.idProductoCargado = nuevoId;
          this.resetCarrusel();
          this.cargarPagina(0, nuevoId);  // base-0 interno, igual que detalle-producto
        }
      });
  }

  private resetCarrusel(): void {
    this.displayImages = [];
    this.paginasCargadas = new Set<number>();
    this.cargaInicialCompletada = false;
    this.totalPaginas = 0;
    this.objectUrls.forEach(u => URL.revokeObjectURL(u));
    this.objectUrls = [];
  }

  private cargarPagina(pagina: number, productoId?: number): void {
    const id = productoId ?? this.idProductoCargado;
    if (!id || this.paginasCargadas.has(pagina)) return;
    this.paginasCargadas.add(pagina);

    if (pagina === 0) this.cargandoImagenes = true;

    // API es base-1, internamente usamos base-0 igual que detalle-producto
    this.serviceProducto.getImagenesProducto(id, pagina + 1, PAGE_SIZE).subscribe({
      next: (data: ProductoImagenPaginadaDto) => {
        if (pagina === 0) {
          this.cargandoImagenes       = false;
          this.totalPaginas           = data.totalPaginas ?? 1;
          this.cargaInicialCompletada = true;

          const principal = data.listaImagenes?.find(d => d.principal);
          if (principal && this.productoActualizar) {
            this.productoActualizar.imagenPrincipalId = principal.id;
          }
        }

        const nuevas: ImagenVista[] = (data.listaImagenes ?? [])
          .filter(dto => !this.displayImages.some(v => v.dto.id === dto.id))
          .map(dto => ({ dto, src: '', cargando: true, error: false }));

        this.displayImages = [...this.displayImages, ...nuevas];

        nuevas.forEach(item => {
          const urlImagen = item.dto.urlImagen;
          if (!urlImagen) { this.displayImages = this.displayImages.filter(v => v !== item); return; }
          this.serviceProducto.getImagenFileMicro(urlImagen, item.dto.extension || 'image/jpeg').subscribe({
            next: url => {
              this.objectUrls.push(url);
              item.src      = this.sanitizer.bypassSecurityTrustUrl(url);
              item.cargando = false;
            },
            error: () => {
              this.displayImages = this.displayImages.filter(v => v !== item);
            }
          });
        });
      },
      error: () => {
        if (pagina === 1) this.cargandoImagenes = false;
        this.paginasCargadas.delete(pagina);
      }
    });
  }

  handlePageChange(event: any): void {
    if (!this.cargaInicialCompletada) return;
    if (this.paginasCargadas.size >= this.totalPaginas) return;

    const puntoSeleccionado = event.page; // base-0, igual que detalle-producto

    if (!this.paginasCargadas.has(puntoSeleccionado) && puntoSeleccionado < this.totalPaginas) {
      this.cargarPagina(puntoSeleccionado);
      return;
    }

    for (let i = 0; i < this.totalPaginas; i++) {
      if (!this.paginasCargadas.has(i)) { this.cargarPagina(i); break; }
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────────
  eliminarImagen(item: ImagenVista): void {
    if (this.eliminando.has(item.dto.id)) return;

    Swal.fire({
      title: '¿Eliminar imagen?',
      text: item.dto.nombreImagen,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#1e1b4b',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.eliminando.add(item.dto.id);

      this.serviceProducto.deleteImagen(item.dto.id).subscribe({
        next: (res: any) => {
          this.eliminando.delete(item.dto.id);
          this.displayImages = this.displayImages.filter(v => v.dto.id !== item.dto.id);
          Swal.fire({ icon: 'success', title: res?.data ?? 'Imagen eliminada', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        },
        error: () => {
          this.eliminando.delete(item.dto.id);
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        }
      });
    });
  }

  estaEliminando(id: string): boolean { return this.eliminando.has(id); }

  // ── Principal ──────────────────────────────────────────────────────
  setPrincipal(item: ImagenVista): void {
    if (item.dto.principal) return;
    this.displayImages.forEach(v => v.dto.principal = false);
    item.dto.principal = true;
    if (this.productoActualizar) {
      this.productoActualizar.imagenPrincipalId = item.dto.id;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }
}
