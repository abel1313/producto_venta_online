import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import Swal from 'sweetalert2';
import { IPalabraClave } from '../palabras-clave/models/palabra-clave.model';
import { ProductoService } from '../productos/service/producto.service';
import { IArchivoSeleccionado, ICompletarProducto, IEstadoCargaProducto, ITarjetaCaptura } from './models/carga-imagen.model';
import { CargaImagenesService } from './service/carga-imagenes.service';

@Component({
  selector: 'app-carga-imagenes',
  templateUrl: './carga-imagenes.component.html',
  styleUrls: ['./carga-imagenes.component.scss']
})
export class CargaImagenesComponent implements OnInit, OnDestroy {

  @ViewChild('videoScanner') videoScanner!: ElementRef<HTMLVideoElement>;

  // Bandeja de selección: elegidas pero aún NO subidas. El usuario las revisa
  // (nombre, peso, miniatura) y decide; nada sale a la red hasta pulsar "Subir".
  seleccionadas: IArchivoSeleccionado[] = [];

  // Ya subidas — cada una es un producto borrador vivo en el back.
  tarjetas: ITarjetaCaptura[] = [];

  // Cuántos POST /subir-imagen siguen en vuelo. Es un contador, no un booleano:
  // al subir 10 fotos, la primera respuesta no debe apagar el indicador de las otras 9.
  enVuelo = 0;

  // Formulario de "completar borrador" — se abre sobre una tarjeta EXITOSO
  editando: ITarjetaCaptura | null = null;
  guardando = false;
  errorForm = '';
  form: ICompletarProducto = {};
  palabraClaveSel: IPalabraClave | null = null;

  // Escáner de código de barras (mismo patrón que variante/buscar/buscar.component.ts)
  escaneando = false;
  private controlesEscaner: IScannerControls | null = null;

  // productoId que siguen en PENDIENTE. Cuando queda vacío se detiene el polling.
  private pendientes = new Set<number>();
  private intervalo: any = null;

  constructor(
    private readonly svc: CargaImagenesService,
    private readonly productoSvc: ProductoService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarPendientes();
  }

  // Red de seguridad al entrar/recargar: antes solo se pedía GET /fallidas, así que un
  // borrador EXITOSO (imagen lista, esperando "Completar datos") se perdía de la vista al
  // salir de la pantalla — el producto seguía vivo en la base, solo dejaba de mostrarse.
  // El back recomendó dejar de usar /fallidas y combinar estas dos llamadas, que sí traen
  // TODOS los pendientes (PENDIENTE + EXITOSO + FALLIDO), no solo los fallidos.
  private cargarPendientes(): void {
    this.productoSvc.adminFiltrar({ codigoGenerado: true, habilitado: false }, 1, 100).subscribe({
      next: pag => {
        const ids = (pag?.t ?? []).map(p => p.idProducto).filter((id): id is number => !!id);
        if (!ids.length) { return; }

        this.svc.estado(ids).subscribe({
          next: estados => estados.forEach(r => {
            if (this.tarjetas.some(t => t.productoId === r.productoId)) { return; }
            this.tarjetas.push(this.aTarjeta(r, null, '', 'previo'));
            if (r.estadoImagen === 'PENDIENTE') {
              this.pendientes.add(r.productoId);
              this.arrancarPolling();
            }
          }),
          error: () => { /* no bloquea la captura — es solo un extra al entrar */ }
        });
      },
      error: () => { /* no bloquea la captura — es solo un extra al entrar */ }
    });
  }

  ngOnDestroy(): void {
    this.detenerPolling();
    this.detenerEscaner();
    // Libera los ObjectURL de la bandeja; los de las tarjetas se liberan al quitarlas.
    this.seleccionadas.forEach(s => URL.revokeObjectURL(s.previewUrl));
  }

  // Peso legible: los archivos de cámara rondan los MB, no sirve verlos en bytes.
  formatoPeso(bytes: number): string {
    if (bytes < 1024) { return `${bytes} B`; }
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(0)} KB`; }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  // ---------- Selección (NO sube nada todavía) ----------

  onArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    // Se limpia el input para poder volver a elegir el mismo archivo si se quitó
    // de la bandeja (si no, el navegador no dispara `change` con el mismo valor).
    input.value = '';

    if (!files.length) { return; }

    const repetidos: string[] = [];

    files.forEach(f => {
      const firma = this.firmaDe(f);
      // Una foto ya subida no se vuelve a subir (crearía un borrador duplicado),
      // y tampoco se duplica dentro de la propia bandeja de selección.
      if (this.tarjetas.some(t => t.firma === firma) ||
          this.seleccionadas.some(s => s.firma === firma)) {
        repetidos.push(f.name);
        return;
      }
      const objectUrl = URL.createObjectURL(f);
      this.seleccionadas.push({
        file: f,
        // Se sanea una sola vez aquí, no en el template: llamar a
        // bypassSecurityTrust… desde un binding devuelve un objeto nuevo en
        // cada ciclo de detección de cambios y Angular nunca deja de repintar.
        preview: this.sanitizer.bypassSecurityTrustUrl(objectUrl),
        previewUrl: objectUrl,
        nombre: f.name,
        tamano: f.size,
        firma,
        subiendo: false,
        error: ''
      });
    });

    if (repetidos.length) {
      Swal.fire({
        icon: 'info',
        title: 'Imagen repetida',
        text: repetidos.length === 1
          ? `"${repetidos[0]}" ya está en la lista o ya se subió — se omitió.`
          : `${repetidos.length} imágenes ya estaban en la lista o ya se habían subido y se omitieron.`
      });
    }
  }

  quitarSeleccionada(i: number): void {
    const s = this.seleccionadas[i];
    if (!s || s.subiendo) { return; }
    URL.revokeObjectURL(s.previewUrl);
    this.seleccionadas.splice(i, 1);
  }

  limpiarSeleccion(): void {
    if (this.enVuelo > 0) { return; }
    this.seleccionadas.forEach(s => URL.revokeObjectURL(s.previewUrl));
    this.seleccionadas = [];
  }

  get pesoTotal(): number {
    return this.seleccionadas.reduce((acc, s) => acc + s.tamano, 0);
  }

  get hayFallidasEnSeleccion(): boolean {
    return this.seleccionadas.some(s => !!s.error);
  }

  // ---------- Subida ----------

  // Sube TODA la bandeja. Cada archivo que entra bien sale de la lista;
  // el que falla se queda con su error, así la bandeja solo queda vacía
  // cuando de verdad subieron todas.
  subirTodas(): void {
    if (!this.seleccionadas.length || this.enVuelo > 0) { return; }
    // Copia: el array original se va mutando conforme cada subida termina.
    [...this.seleccionadas].forEach(s => this.subirUna(s));
  }

  // Reintenta solo las que quedaron con error, sin volver a mandar las que ya entraron.
  reintentarFallidas(): void {
    if (this.enVuelo > 0) { return; }
    [...this.seleccionadas].filter(s => !!s.error).forEach(s => this.subirUna(s));
  }

  private subirUna(sel: IArchivoSeleccionado): void {
    if (sel.subiendo) { return; }
    sel.subiendo = true;
    sel.error    = '';
    this.enVuelo++;

    this.svc.subirImagen(sel.file).subscribe({
      next: res => {
        this.enVuelo--;
        // Entró: pasa de la bandeja a la grilla de borradores. El preview se
        // reutiliza en la tarjeta (no se revoca aquí, la tarjeta lo sigue usando).
        this.tarjetas.unshift(this.aTarjeta(res, sel.preview, sel.previewUrl, sel.nombre, sel.firma));
        const i = this.seleccionadas.indexOf(sel);
        if (i >= 0) { this.seleccionadas.splice(i, 1); }

        if (res.estadoImagen === 'PENDIENTE') {
          this.pendientes.add(res.productoId);
          this.arrancarPolling();
        }
      },
      error: err => {
        this.enVuelo--;
        sel.subiendo = false;
        // Se queda en la bandeja con su nombre, peso y miniatura visibles
        // para poder reintentarla sin volver a buscarla en el disco.
        sel.error = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo subir (error de red).';
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
        t.firma         = this.firmaDe(file);
        t.nombreArchivo = file.name;
        if (t.previewUrl) { URL.revokeObjectURL(t.previewUrl); }
        const objectUrl = URL.createObjectURL(file);
        t.previewUrl    = objectUrl;
        t.previewLocal  = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
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
    this.detenerEscaner();
    this.editando = null;
    this.form = {};
    this.errorForm = '';
    this.palabraClaveSel = null;
  }

  onPalabraClave(pc: IPalabraClave | null): void {
    this.palabraClaveSel = pc;
    this.form.palabraClaveId = pc?.id ?? undefined;
  }

  // Mismo formato que "Agregar producto" (add.component.ts): MMDDAAAA +
  // 5 dígitos aleatorios = 13 caracteres. Aquí es un botón puntual, no un
  // toggle — el borrador ya tiene su código temporal BRD-...; esto solo
  // rellena el campo del código REAL cuando el producto no trae uno propio
  // (ej. viene de una foto suelta sin empaque/etiqueta legible).
  generarCodigoBarras(): void {
    const now  = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    this.form.codigoBarras = `${mm}${dd}${yyyy}${rand}`;
  }

  // Escanea el código de barras real con la cámara (mismo patrón que
  // variante/buscar/buscar.component.ts → iniciarEscaner()) y lo escribe
  // directo en el campo del formulario de completar borrador.
  async iniciarEscaner(): Promise<void> {
    this.escaneando = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      const reader = new BrowserMultiFormatReader();
      this.controlesEscaner = await reader.decodeFromVideoDevice(
        undefined,
        this.videoScanner.nativeElement,
        (result, _err, controls) => {
          if (result) {
            this.form.codigoBarras = result.getText();
            controls.stop();
            this.escaneando = false;
          }
        }
      );
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo acceder a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.' });
      this.escaneando = false;
    }
  }

  detenerEscaner(): void {
    this.controlesEscaner?.stop();
    this.controlesEscaner = null;
    this.escaneando = false;
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

  // Borra el borrador para siempre (producto + variante + imagen) — antes solo sacaba la
  // tarjeta del array local, así que "reaparecía" en el siguiente GET /fallidas porque el
  // producto seguía vivo en la base. Ahora sí es permanente, por eso pide confirmación.
  quitarTarjeta(t: ITarjetaCaptura): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Descartar este borrador?',
      text: 'Se borra el producto, su variante y la imagen para siempre — no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, descartar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) { return; }

      this.svc.descartar(t.productoId).subscribe({
        next: () => {
          this.pendientes.delete(t.productoId);
          if (t.previewUrl) { URL.revokeObjectURL(t.previewUrl); }
          this.tarjetas = this.tarjetas.filter(x => x.productoId !== t.productoId);
        },
        error: err => {
          // El back responde 400 si el producto ya tiene código de barras real
          // (ya no es un borrador) — protección para no borrar algo ya completado.
          Swal.fire({
            icon: 'error',
            title: 'No se pudo descartar',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
          });
        }
      });
    });
  }

  get totalExitosas(): number { return this.tarjetas.filter(t => t.estadoImagen === 'EXITOSO').length; }
  get totalFallidas(): number { return this.tarjetas.filter(t => t.estadoImagen === 'FALLIDO').length; }
  get totalPendientes(): number { return this.tarjetas.filter(t => t.estadoImagen === 'PENDIENTE').length; }

  private firmaDe(f: File): string { return `${f.name}|${f.size}|${f.lastModified}`; }

  private aTarjeta(r: IEstadoCargaProducto, preview: SafeUrl | null, previewUrl: string,
                   nombre: string, firma = ''): ITarjetaCaptura {
    return { ...r, previewLocal: preview, previewUrl, nombreArchivo: nombre, firma, reintentando: false };
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
