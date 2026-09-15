import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { NegocioService, INegocioEstado } from 'src/app/negocio/negocio.service';
import { CENTRO_MAPA_GENERICO } from 'src/app/shared/selector-ubicacion/selector-ubicacion.component';
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
  guardandoAlertaStock = false;
  guardandoUbicacion = false;

  // Ubicacion del local: lo que ve el cliente en login y registro. No va en un FormGroup porque
  // lat/lng no se teclean -- las pone el mapa; solo la direccion es un campo escrito.
  direccionLocal = '';
  latitudLocal:  number | null = null;
  longitudLocal: number | null = null;
  readonly centroMapa = CENTRO_MAPA_GENERICO;

  horarioForm!:   FormGroup;
  contactosForm!: FormGroup;
  alertaStockForm!: FormGroup;

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
    this.alertaStockForm = this.fb.group({
      umbralStockBajo: [5, [Validators.required, Validators.min(1)]]
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
        this.alertaStockForm.patchValue({
          umbralStockBajo: config?.umbralStockBajo ?? 5
        });
        this.direccionLocal = config?.direccion ?? '';
        this.latitudLocal   = config?.latitud   ?? null;
        this.longitudLocal  = config?.longitud  ?? null;
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
      // ⚠️ Antes esto solo invertía el booleano en memoria, sin volver a preguntarle al
      // back -- si el scheduler de auto-cierre revertía el cambio segundos después (ver fix en
      // NegocioService.verificarAutoCierre()), esta pantalla seguía mostrando "abierto"
      // indefinidamente aunque el resto del sitio ya viera "cerrado" otra vez. Se vuelve a
      // pedir el estado real en vez de asumirlo.
      next: () => {
        this.toggling = false;
        this.cargarConfig();
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

  // ── Ubicacion del local ────────────────────────────────────────────
  // El punto se marca con el mismo selector de mapa del punto de encuentro de las entregas
  // (app-selector-ubicacion): trae buscador de direcciones y "usar mi ubicacion", asi que el
  // dueno puede pararse en el local y marcarlo de un toque.

  onUbicacionCambio(p: { lat: number; lng: number }): void {
    this.latitudLocal  = p.lat;
    this.longitudLocal = p.lng;
  }

  get ubicacionMarcada(): boolean {
    return this.latitudLocal != null && this.longitudLocal != null;
  }

  /** Qué le falta para poder guardar — se muestra en pantalla en vez de solo deshabilitar. */
  get faltaParaUbicacion(): string | null {
    if (!this.direccionLocal.trim() && !this.ubicacionMarcada) {
      return 'Escribe la dirección y marca el punto en el mapa.';
    }
    if (!this.direccionLocal.trim()) return 'Falta escribir la dirección que verá el cliente.';
    if (!this.ubicacionMarcada) return 'Falta marcar el punto en el mapa (toca el mapa o arrastra el pin).';
    return null;
  }

  guardarUbicacion(): void {
    if (this.faltaParaUbicacion) return;
    this.guardandoUbicacion = true;
    this.negocioService.actualizarUbicacion({
      direccion: this.direccionLocal.trim(),
      latitud:   this.latitudLocal,
      longitud:  this.longitudLocal
    }).subscribe({
      next: () => {
        this.guardandoUbicacion = false;
        if (this.estado) {
          this.estado.direccion = this.direccionLocal.trim();
          this.estado.latitud   = this.latitudLocal;
          this.estado.longitud  = this.longitudLocal;
        }
        Swal.fire({ icon: 'success', title: '¡Ubicación guardada!', text: 'Ya se ve en el login y en el registro.', timer: 1600, showConfirmButton: false });
      },
      error: (err) => {
        this.guardandoUbicacion = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar la ubicación', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar la ubicación del local.' });
      }
    });
  }

  quitarUbicacion(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar la ubicación?',
      text: 'El mapa dejará de aparecer en el login y en el registro.',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitarla',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.guardandoUbicacion = true;
      this.negocioService.actualizarUbicacion({ direccion: null, latitud: null, longitud: null }).subscribe({
        next: () => {
          this.guardandoUbicacion = false;
          this.direccionLocal = '';
          this.latitudLocal   = null;
          this.longitudLocal  = null;
          if (this.estado) {
            this.estado.direccion = null;
            this.estado.latitud   = null;
            this.estado.longitud  = null;
          }
          Swal.fire({ icon: 'success', title: 'Ubicación quitada', timer: 1400, showConfirmButton: false });
        },
        error: (err) => {
          this.guardandoUbicacion = false;
          Swal.fire({ icon: 'error', title: 'Error al quitar la ubicación', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo quitar la ubicación.' });
        }
      });
    });
  }

  // ── Guardar umbral de stock bajo ───────────────────────────────────
  // Aviso diario por correo (7 AM) a todos los admin con las variantes en o por debajo de este
  // número de unidades. Ver StockBajoScheduler en el back.

  guardarAlertaStock(): void {
    if (this.alertaStockForm.invalid) return;
    this.guardandoAlertaStock = true;
    this.negocioService.actualizarUmbralStockBajo(this.alertaStockForm.value).subscribe({
      next: () => {
        this.guardandoAlertaStock = false;
        if (this.estado) this.estado.umbralStockBajo = this.alertaStockForm.value.umbralStockBajo;
        Swal.fire({ icon: 'success', title: '¡Umbral actualizado!', timer: 1400, showConfirmButton: false });
      },
      error: (err) => {
        this.guardandoAlertaStock = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar el umbral', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar el umbral de stock bajo.', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
