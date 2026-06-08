import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { PresentacionService, IImagenPresentacionV2Dto, IImagenUpdateRequest } from 'src/app/presentacion/presentacion.service';

interface IArchivoPendiente {
  base64:    string;   // sin prefijo data:
  extension: string;   // jpg, png…
  nombre:    string;   // nombre original del archivo
  preview:   string;   // data URL para previsualizar
}

@Component({
  selector: 'app-presentacion-imagenes',
  templateUrl: './presentacion-imagenes.component.html',
  styleUrls: ['./presentacion-imagenes.component.scss']
})
export class PresentacionImagenesComponent implements OnInit {

  imagenes:    IImagenPresentacionV2Dto[] = [];
  guardandoId: number | null = null;

  pendientes = new Map<number, IArchivoPendiente>();

  constructor(
    private readonly presentacionService: PresentacionService
  ) {}

  ngOnInit(): void { this.cargar(); }

  private cargar(): void {
    this.presentacionService.getTodasImagenesV2().subscribe({
      next: imgs => { this.imagenes = imgs; },
      error: () => {}
    });
  }

  get login():    IImagenPresentacionV2Dto[] { return this.imagenes.filter(i => i.tipo === 'LOGIN'); }
  get registro(): IImagenPresentacionV2Dto[] { return this.imagenes.filter(i => i.tipo === 'REGISTRO'); }

  // ── URL de imagen guardada en el servidor ─────────────────────────
  imagenSrc(img: IImagenPresentacionV2Dto): string {
    const p = this.pendientes.get(img.id);
    if (p) return p.preview;
    return this.presentacionService.getImagenUrlV2(img.id);
  }

  tieneImagen(img: IImagenPresentacionV2Dto): boolean {
    return !!this.pendientes.get(img.id) || img.id > 0;
  }

  tienePendiente(img: IImagenPresentacionV2Dto): boolean {
    return this.pendientes.has(img.id);
  }

  // ── Selección de archivo ──────────────────────────────────────────
  seleccionarArchivo(img: IImagenPresentacionV2Dto, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.pendientes.set(img.id, {
        base64:    dataUrl.split(',')[1],
        extension,
        nombre:    file.name,
        preview:   dataUrl
      });
    };
    reader.readAsDataURL(file);
    // Limpiar input para permitir reseleccionar el mismo archivo
    (event.target as HTMLInputElement).value = '';
  }

  quitarPendiente(img: IImagenPresentacionV2Dto): void {
    this.pendientes.delete(img.id);
  }

  // ── Guardar ───────────────────────────────────────────────────────
  guardar(img: IImagenPresentacionV2Dto): void {
    this.guardandoId = img.id;
    const p = this.pendientes.get(img.id);

    const request: IImagenUpdateRequest = {
      descripcion: img.descripcion,
      activo:      img.activo,
      ...(p ? { base64: p.base64, extension: p.extension, nombreImagen: p.nombre } : {})
    };

    this.presentacionService.actualizarImagenV2(img.id, request).subscribe({
      next: (updated: IImagenPresentacionV2Dto) => {
        this.guardandoId = null;
        this.pendientes.delete(img.id);
        if (updated?.urlImagen) img.urlImagen = updated.urlImagen;
        Swal.fire({ icon: 'success', title: '¡Imagen actualizada!', timer: 1300, showConfirmButton: false });
      },
      error: () => {
        this.guardandoId = null;
        Swal.fire({ icon: 'error', title: 'Error al guardar', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
