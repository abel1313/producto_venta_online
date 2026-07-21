import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { IPalabraClave } from '../palabras-clave/models/palabra-clave.model';
import { ICompletarProducto, IEstadoCargaProducto, ITarjetaCaptura } from './models/carga-imagen.model';
import { CargaImagenesService } from './service/carga-imagenes.service';

@Component({
  selector: 'app-carga-imagenes',
  templateUrl: './carga-imagenes.component.html',
  styleUrls: ['./carga-imagenes.component.scss']
})
export class CargaImagenesComponent implements OnInit, OnDestroy {

  tarjetas: ITarjetaCaptura[] = [];
  // Cuántos POST /subir-imagen siguen en vuelo. Es un contador, no un booleano:
  // al subir 10 fotos, la primera respuesta no debe apagar el indicador de las otras 9.
  enVuelo = 0;
  // Los errores se acumulan: si fallan 3 de 10, el usuario debe verlos los 3,
  // no solo el último (un string suelto se pisa a sí mismo).
  erroresSubida: string[] = [];

  // Formulario de "completar borrador" — se abre sobre una tarjeta EXITOSO
  editando: ITarjetaCaptura | null = null;
  guardando = false;
  errorForm = '';
  form: ICompletarProducto = {};
  palabraClaveSel: IPalabraClave | null = null;

  // productoId que siguen en PENDIENTE. Cuando queda vacío se detiene el polling.
  private pendientes = new Set<number>();
  private intervalo: any = null;

  constructor(private readonly svc: CargaImagenesService) {}

  ngOnInit(): void {
    // Red de seguridad: si en una sesión anterior quedaron borradores con imagen
    // fallida, se muestran aquí para poder reintentarlos sin adivinar cuáles fueron.
    this.svc.fallidas().subscribe({
      next: res => res.forEach(r => this.tarjetas.push(this.aTarjeta(r, '', 'previo'))),
      error: () => { /* no bloquea la captura — es solo un extra al entrar */ }
    });
  }

  ngOnDestroy(): void { this.detenerPolling(); }

  // ---------- Selección de archivos ----------

  onArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // permite volver a elegir el mismo archivo si se eliminó la tarjeta

    if (!files.length) { return; }

    this.erroresSubida = [];
    const repetidos: string[] = [];

    files.forEach(f => {
      const firma = this.firmaDe(f);
      // Regla: una foto que ya se subió en esta pantalla no se vuelve a subir —
      // si no, se crearía un producto borrador duplicado por cada intento.
      if (this.tarjetas.some(t => t.firma === firma)) {
        repetidos.push(f.name);
        return;
      }
      this.subirUna(f, firma);
    });

    if (repetidos.length) {
      Swal.fire({
        icon: 'info',
        title: 'Imagen ya subida',
        text: repetidos.length === 1
          ? `"${repetidos[0]}" ya se subió en esta sesión — no se vuelve a subir.`
          : `${repetidos.length} imágenes ya se habían subido en esta sesión y se omitieron.`
      });
    }
  }

  private subirUna(archivo: File, firma: string): void {
    this.enVuelo++;
    const preview = URL.createObjectURL(archivo);

    this.svc.subirImagen(archivo).subscribe({
      next: res => {
        this.enVuelo--;
        this.tarjetas.unshift(this.aTarjeta(res, preview, archivo.name, firma));
        if (res.estadoImagen === 'PENDIENTE') {
          this.pendientes.add(res.productoId);
          this.arrancarPolling();
        }
      },
      error: err => {
        this.enVuelo--;
        URL.revokeObjectURL(preview);
        const motivo = (err?.error?.mensaje ?? err?.error?.message) ?? 'error de red';
        // Se nombra el archivo: con 10 fotos, "no se pudo subir" a secas no dice cuál.
        this.erroresSubida.push(`"${archivo.name}": ${motivo}`);
      }
    });
  }

  // ---------- Polling de estado ----------

  private arrancarPolling(): void {
    if (this.intervalo) { return; }
    this.intervalo = setInterval(() => {
      if (this.pendientes.size === 0) { this.detenerPolling(); return; }
      this.svc.estado([...this.pendientes]).subscribe({
        next: items => items.forEach(item => {
          if (item.estadoImagen !== 'PENDIENTE') {
            this.pendientes.delete(item.productoId);
            this.aplicarEstado(item);
          }
        }),
        error: () => { /* reintenta en el siguiente tick */ }
      });
    }, 2500);
  }

  private detenerPolling(): void {
    if (this.intervalo) { clearInterval(this.intervalo); this.intervalo = null; }
  }

  private aplicarEstado(item: IEstadoCargaProducto): void {
    const t = this.tarjetas.find(x => x.productoId === item.productoId);
    if (!t) { return; }
    t.estadoImagen       = item.estadoImagen;
    t.imagenId           = item.imagenId;
    t.urlImagen          = item.urlImagen;
    t.mensajeErrorImagen = item.mensajeErrorImagen;
    t.reintentando       = false;
  }

  // ---------- Reintentar (solo tarjetas FALLIDO) ----------

  onReintentar(t: ITarjetaCaptura, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = '';
    if (!file) { return; }

    t.reintentando = true;
    // Reutiliza el mismo producto/variante — no crea un borrador nuevo
    this.svc.reintentarImagen(t.productoId, file).subscribe({
      next: res => {
        t.firma        = this.firmaDe(file);
        t.nombreArchivo = file.name;
        if (t.previewLocal) { URL.revokeObjectURL(t.previewLocal); }
        t.previewLocal = URL.createObjectURL(file);
        this.aplicarEstado(res);
        t.reintentando = true; // sigue en PENDIENTE hasta que el polling confirme
        this.pendientes.add(t.productoId);
        this.arrancarPolling();
      },
      error: err => {
        t.reintentando = false;
        t.mensajeErrorImagen = (err?.error?.mensaje ?? err?.error?.message)
          ?? 'No se pudo reintentar la imagen.';
      }
    });
  }

  // ---------- Completar el borrador ----------

  abrirForm(t: ITarjetaCaptura): void {
    if (t.estadoImagen !== 'EXITOSO') { return; }
    this.editando = t;
    this.errorForm = '';
    this.palabraClaveSel = null;
    // El código de barras autogenerado (BRD-...) nunca se muestra ni se precarga:
    // el campo arranca vacío para que el usuario capture el real.
    this.form = { piezas: 1 };
  }

  cerrarForm(): void {
    this.editando = null;
    this.form = {};
    this.errorForm = '';
    this.palabraClaveSel = null;
  }

  onPalabraClave(pc: IPalabraClave | null): void {
    this.palabraClaveSel = pc;
    this.form.palabraClaveId = pc?.id ?? undefined;
  }

  guardarAvance(publicar: boolean): void {
    if (!this.editando || this.guardando) { return; }
    this.guardando = true;
    this.errorForm = '';

    const productoId = this.editando.productoId;
    const body: ICompletarProducto = { ...this.limpiar(this.form) };
    if (publicar) { body.habilitar = true; }

    this.svc.completar(productoId, body).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          icon: 'success',
          title: publicar ? 'Producto publicado' : 'Avance guardado',
          text: publicar
            ? 'El producto ya está habilitado y visible en la tienda.'
            : 'Puedes seguir llenando el resto de los campos cuando quieras.',
          timer: publicar ? undefined : 1600,
          showConfirmButton: publicar
        });
        if (publicar) { this.cerrarForm(); }
      },
      error: err => {
        this.guardando = false;
        this.errorForm = (err?.error?.mensaje ?? err?.error?.message)
          ?? 'No se pudo guardar. Revisa los datos e intenta de nuevo.';
      }
    });
  }

  // ---------- Utilidades ----------

  quitarTarjeta(t: ITarjetaCaptura): void {
    // Solo la saca de la vista — el borrador sigue existiendo en el back
    // y se puede retomar desde "productos no habilitados".
    this.pendientes.delete(t.productoId);
    if (t.previewLocal) { URL.revokeObjectURL(t.previewLocal); }
    this.tarjetas = this.tarjetas.filter(x => x.productoId !== t.productoId);
  }

  get totalExitosas(): number { return this.tarjetas.filter(t => t.estadoImagen === 'EXITOSO').length; }
  get totalFallidas(): number { return this.tarjetas.filter(t => t.estadoImagen === 'FALLIDO').length; }
  get totalPendientes(): number { return this.tarjetas.filter(t => t.estadoImagen === 'PENDIENTE').length; }

  private firmaDe(f: File): string { return `${f.name}|${f.size}|${f.lastModified}`; }

  private aTarjeta(r: IEstadoCargaProducto, preview: string, nombre: string, firma = ''): ITarjetaCaptura {
    return { ...r, previewLocal: preview, nombreArchivo: nombre, firma, reintentando: false };
  }

  // Quita campos vacíos: el back interpreta null como "no tocar este campo"
  private limpiar(f: ICompletarProducto): ICompletarProducto {
    const out: any = {};
    Object.entries(f).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') { out[k] = v; }
    });
    return out;
  }
}
