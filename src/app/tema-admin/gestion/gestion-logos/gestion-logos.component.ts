import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { ILogo } from '../../models/logo.model';
import { LogoService } from '../../service/logo.service';

// Pantalla "Logos" (Personalización > Logos) -- pedido 2026-08-28: antes no existía ningún
// archivo de logo en el proyecto (ver comentario histórico en EmailService.encabezadoMarca()),
// el correo salía con ícono+texto. Acá el admin sube uno o varios logos y elige cuál de todos es
// el que se usa en el encabezado de los correos -- "activo" es selección única, no un checklist.
@Component({
  selector: 'app-gestion-logos',
  templateUrl: './gestion-logos.component.html',
  styleUrls: ['./gestion-logos.component.scss']
})
export class GestionLogosComponent implements OnInit {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  logos: ILogo[] = [];
  cargando = true;
  subiendo = false;
  activando = new Set<number>();
  eliminando = new Set<number>();

  private readonly TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];

  constructor(private readonly service: LogoService) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.service.listar().subscribe({
      next: logos => { this.logos = logos; this.cargando = false; },
      error: () => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudieron cargar los logos', timer: 2000, showConfirmButton: false });
      }
    });
  }

  urlDe(logo: ILogo): string {
    return this.service.urlCompleta(logo);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!this.TIPOS_PERMITIDOS.includes(file.type)) {
      Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: `"${file.name}" no es PNG, JPG, GIF ni SVG.`, timer: 2500, showConfirmButton: false });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const extension = file.type.split('/')[1];
      this.subiendo = true;
      this.service.subir({ base64, extension, nombreImagen: file.name }).subscribe({
        next: logo => {
          this.logos = [logo, ...this.logos.map(l => ({ ...l, activo: logo.activo ? false : l.activo }))];
          this.subiendo = false;
          Swal.fire({ icon: 'success', title: 'Logo subido', timer: 1400, showConfirmButton: false });
        },
        error: () => {
          this.subiendo = false;
          Swal.fire({ icon: 'error', title: 'No se pudo subir el logo', timer: 2000, showConfirmButton: false });
        }
      });
    };
    reader.readAsDataURL(file);
  }

  activar(logo: ILogo): void {
    if (logo.activo || this.activando.has(logo.id)) return;
    this.activando.add(logo.id);
    this.service.activar(logo.id).subscribe({
      next: () => {
        this.logos = this.logos.map(l => ({ ...l, activo: l.id === logo.id }));
        this.activando.delete(logo.id);
      },
      error: () => {
        this.activando.delete(logo.id);
        Swal.fire({ icon: 'error', title: 'No se pudo activar el logo', timer: 2000, showConfirmButton: false });
      }
    });
  }

  eliminar(logo: ILogo): void {
    Swal.fire({
      title: '¿Eliminar este logo?',
      text: logo.activo ? 'Es el que se usa hoy en los correos -- si lo borras, el encabezado vuelve al ícono genérico hasta que actives otro.' : undefined,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.eliminando.add(logo.id);
      this.service.eliminar(logo.id).subscribe({
        next: () => {
          this.logos = this.logos.filter(l => l.id !== logo.id);
          this.eliminando.delete(logo.id);
        },
        error: () => {
          this.eliminando.delete(logo.id);
          Swal.fire({ icon: 'error', title: 'No se pudo eliminar', timer: 2000, showConfirmButton: false });
        }
      });
    });
  }
}
