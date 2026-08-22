import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { NegocioService, INegocioEstado } from 'src/app/negocio/negocio.service';
import { horaLegible } from 'src/app/shared/hora.util';

@Component({
  selector: 'app-config-negocio',
  templateUrl: './config-negocio.component.html',
  styleUrls: ['./config-negocio.component.scss']
})
export class ConfigNegocioComponent implements OnInit {

  estado: INegocioEstado | null = null;
  /**
   * Hasta que no se sepa qué hay guardado, no se deja guardar: el `PUT` de contactos
   * interpreta `""` como «bórralo», así que guardar con el formulario en blanco borraría
   * las URLs que ya existían.
   */
  configCargada    = false;
  toggling         = false;
  guardandoHorario = false;
  guardandoContactos = false;

  horarioForm!:   FormGroup;
  contactosForm!: FormGroup;

  constructor(
    private readonly negocioService: NegocioService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.horarioForm = this.fb.group({
      horaApertura: ['09:00'],
      horaCierre:   ['21:00']
    });
    this.contactosForm = this.fb.group({
      whatsappUrl:  [''],
      facebookUrl:  [''],
      instagramUrl: [''],
      tiktokUrl:    ['']
    });
    this.cargarConfig();
  }

  /**
   * ⚠️ La respuesta viene envuelta en `ResponseGeneric` y el servicio ya la desenvuelve.
   * Antes aquí se leían DOS niveles a la vez (`data.data` para el estado y `data.horaApertura`
   * para el formulario): el segundo siempre era `undefined`, así que el horario volvía a
   * 09:00–21:00 y las URLs salían vacías aunque estuvieran guardadas.
   */
  private cargarConfig(): void {
    this.negocioService.getConfig().subscribe({
      next: (config) => {
        this.estado = config;
        this.horarioForm.patchValue({
          horaApertura: config?.horaApertura || '09:00',
          horaCierre:   config?.horaCierre   || '21:00'
        });
        this.contactosForm.patchValue({
          whatsappUrl:  config?.whatsappUrl  ?? '',
          facebookUrl:  config?.facebookUrl  ?? '',
          instagramUrl: config?.instagramUrl ?? '',
          tiktokUrl:    config?.tiktokUrl    ?? ''
        });
        this.configCargada = true;
      },
      error: (err) => {
        // Se deja `configCargada` en false a propósito: si no se pudo leer lo guardado,
        // guardar mandaría cadenas vacías y BORRARÍA las URLs que ya existían.
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar configuración',
          text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la configuración del negocio.'
        });
      }
    });
  }

  // ── Toggle instantáneo (sin confirmación) ─────────────────────────

  toggleNegocio(): void {
    if (!this.estado || this.toggling) return;
    this.toggling = true;
    const accion$ = this.estado.abierto
      ? this.negocioService.cerrar()
      : this.negocioService.abrir();

    accion$.subscribe({
      next: () => {
        this.estado!.abierto = !this.estado!.abierto;
        this.toggling = false;
      },
      error: (err) => {
        this.toggling = false;
        Swal.fire({ icon: 'error', title: 'Error al cambiar estado', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cambiar el estado del negocio.', timer: 1600, showConfirmButton: false });
      }
    });
  }

  // ── Guardar horario ────────────────────────────────────────────────

  guardarHorario(): void {
    this.guardandoHorario = true;
    this.negocioService.actualizarHorario(this.horarioForm.value).subscribe({
      next: () => {
        this.guardandoHorario = false;
        if (this.estado) {
          this.estado.horaApertura = this.horarioForm.value.horaApertura;
          this.estado.horaCierre   = this.horarioForm.value.horaCierre;
        }
        Swal.fire({ icon: 'success', title: '¡Horario actualizado!', timer: 1400, showConfirmButton: false });
      },
      error: (err) => {
        this.guardandoHorario = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar horario', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar el horario.', timer: 1600, showConfirmButton: false });
      }
    });
  }

  // Sugerencia del back (doc NEGOCIO_INSTAGRAM_TIKTOK_HORARIO.md): en vez de borrar el
  // texto letra por letra para reemplazar una URL ya guardada, un botón "✕ Limpiar" la
  // vacía de un tirón. No guarda nada — solo limpia el campo en el form; el admin sigue
  // teniendo que darle "Guardar contactos" para persistirlo.
  /**
   * "18:00" → "6:00 p.m." — el `<input type="time">` se pinta según el navegador y en algunas
   * máquinas no muestra el a.m./p.m., así que el horario se leía a medias.
   */
  legible(hhmm?: string | null): string { return horaLegible(hhmm); }

  /** Resumen del horario tal como quedaría guardado, para confirmarlo de un vistazo. */
  get horarioLegible(): string {
    const a = this.legible(this.horarioForm?.get('horaApertura')?.value);
    const c = this.legible(this.horarioForm?.get('horaCierre')?.value);
    return a && c ? `Abre ${a} · Cierra ${c}` : '';
  }

  limpiarCampo(campo: 'whatsappUrl' | 'facebookUrl' | 'instagramUrl' | 'tiktokUrl'): void {
    this.contactosForm.get(campo)?.setValue('');
  }

  // ── Guardar contactos (request existente) ─────────────────────────

  guardarContactos(): void {
    this.guardandoContactos = true;
    this.negocioService.actualizarContactos(this.contactosForm.value).subscribe({
      next: () => {
        this.guardandoContactos = false;
        if (this.estado) {
          this.estado.whatsappUrl  = this.contactosForm.value.whatsappUrl;
          this.estado.facebookUrl  = this.contactosForm.value.facebookUrl;
          this.estado.instagramUrl = this.contactosForm.value.instagramUrl;
          this.estado.tiktokUrl    = this.contactosForm.value.tiktokUrl;
        }
        Swal.fire({ icon: 'success', title: '¡Contactos actualizados!', timer: 1400, showConfirmButton: false });
      },
      error: (err) => {
        this.guardandoContactos = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar contactos', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar los contactos.', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
