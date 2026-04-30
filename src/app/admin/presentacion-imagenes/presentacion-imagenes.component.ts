import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { PresentacionService, IImagenPresentacion, IImagenUpdateRequest } from 'src/app/presentacion/presentacion.service';

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

  imagenes:    IImagenPresentacion[] = [];
  cargando     = true;
  guardandoId: number | null = null;

  // Archivos seleccionados pero aún no guardados (key = img.id)
  pendientes = new Map<number, IArchivoPendiente>();

  constructor(private readonly presentacionService: PresentacionService) {}

  ngOnInit(): void { this.cargar(); }

  private cargar(): void {
    this.cargando = true;
    this.presentacionService.getTodasImagenes().subscribe({
      next: (res: any) => {
        this.imagenes = res?.data ?? res ?? [];
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  get login():    IImagenPresentacion[] { return this.imagenes.filter(i => i.tipo === 'LOGIN'); }
  get registro(): IImagenPresentacion[] { return this.imagenes.filter(i => i.tipo === 'REGISTRO'); }

  // ── URL de imagen guardada en el servidor ─────────────────────────
  imagenSrc(img: IImagenPresentacion): string {
    const p = this.pendientes.get(img.id);
    if (p) return p.preview;                              // preview local antes de guardar
    return this.presentacionService.getImagenUrl(img.id); // URL pública /{id}/imagen
  }

  tieneImagen(img: IImagenPresentacion): boolean {
    return !!this.pendientes.get(img.id) || img.id > 0;
  }

  tienePendiente(img: IImagenPresentacion): boolean {
    return this.pendientes.has(img.id);
  }

  // ── Selección de archivo ──────────────────────────────────────────
  seleccionarArchivo(img: IImagenPresentacion, event: Event): void {
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

  quitarPendiente(img: IImagenPresentacion): void {
    this.pendientes.delete(img.id);
  }

  // ── Guardar ───────────────────────────────────────────────────────
  guardar(img: IImagenPresentacion): void {
    this.guardandoId = img.id;
    const p = this.pendientes.get(img.id);

    const request: IImagenUpdateRequest = {
      descripcion: img.descripcion,
      activo:      img.activo,
      ...(p ? { base64: p.base64, extension: p.extension, nombreImagen: p.nombre } : {})
    };

    this.presentacionService.actualizarImagen(img.id, request).subscribe({
      next: (res: any) => {
        this.guardandoId = null;
        this.pendientes.delete(img.id);
        // Actualizar el nombreArchivo con el que devuelve el backend
        const updated = res?.data ?? res;
        if (updated?.nombreArchivo) img.nombreArchivo = updated.nombreArchivo;
        Swal.fire({ icon: 'success', title: '¡Imagen actualizada!', timer: 1300, showConfirmButton: false });
      },
      error: () => {
        this.guardandoId = null;
        Swal.fire({ icon: 'error', title: 'Error al guardar', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
