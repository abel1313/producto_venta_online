import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  IAccesorioRamo, ICantidadFlor, IColorFlor, IRamoAccesorioRequest, IRamoArmado,
  IRamoArmadoRequest, ITipoFlor
} from '../models/flores.model';
import { FloresService } from '../service/flores.service';
import { FloresImagenService } from '../service/flores-imagen.service';

interface IAccesorioSeleccion {
  accesorio: IAccesorioRamo;
  seleccionado: boolean;
  cantidad: number;
}

/**
 * Admin — armar ramos preconfigurados (Flujo B): el dueño elige especie → color → cantidad, le
 * agrega accesorios, y el back calcula el precio total (flores + papel si aplica + accesorios).
 * Es lo que alimenta la vitrina pública `/flores/ramos` (`GET /v1/ramos-armados/activos`) — sin
 * un ramo creado aquí, esa pantalla siempre se ve vacía aunque el catálogo base ya esté lleno.
 */
@Component({
  selector: 'app-gestion-ramos-flores',
  templateUrl: './gestion-ramos-flores.component.html',
  styleUrls: ['./gestion-ramos-flores.component.scss']
})
export class GestionRamosFloresComponent implements OnInit {

  // ── Catálogos base (para armar el form) ─────────────────────────────────
  tipos: ITipoFlor[] = [];
  colores: IColorFlor[] = [];
  cantidades: ICantidadFlor[] = [];
  accesorios: IAccesorioRamo[] = [];
  cargandoCatalogos = false;

  // ── Lista de ramos (pagina base-1, estilo /v1/promociones) ──────────────
  ramos: IRamoArmado[] = [];
  cargando = false;
  pagina = 1;
  size = 10;
  totalPaginas = 1;
  error: string | null = null;

  // ── Formulario ───────────────────────────────────────────────────────────
  modoForm: 'nuevo' | 'editar' | null = null;
  editandoId: number | null = null;
  guardando = false;

  formNombre = '';
  formTipoFlorId = 0;
  formColorFlorId = 0;
  formCantidadFlorValidaId = 0;
  formImagenUrl = '';
  formActivo = true;
  formAccesorios: IAccesorioSeleccion[] = [];

  // ── Foto del ramo ─────────────────────────────────────────────────
  /** Foto real de cada ramo, indexada por el id de su variante sombra. */
  fotos: Record<number, string | null> = {};
  /** Ramo cuya foto se está subiendo — bloquea solo esa tarjeta. */
  subiendoFoto: number | null = null;

  constructor(
    private readonly flores: FloresService,
    private readonly imagenes: FloresImagenService
  ) {}

  /**
   * Qué imagen mostrar: la foto real si ya la tiene, si no el `imagenUrl` viejo (el link que se
   * pegaba a mano), y si no, nada.
   */
  fotoDe(r: IRamoArmado): string | null {
    return (r.varianteId ? this.fotos[r.varianteId] : null) ?? r.imagenUrl ?? null;
  }

  private cargarFotos(ramos: IRamoArmado[]): void {
    ramos
      .filter(r => !!r.varianteId && this.fotos[r.varianteId!] === undefined)
      .forEach(r => {
        const id = r.varianteId!;
        this.fotos[id] = null;
        this.imagenes.portadaDe(id).subscribe(url => { this.fotos[id] = url; });
      });
  }

  /**
   * Sube la foto del ramo a su variante sombra.
   *
   * ⚠️ Un ramo guardado antes de esta función **todavía no tiene variante** (`varianteId: null`):
   * la crea el back en el siguiente guardado. Por eso el input va deshabilitado en ese caso y el
   * `title` explica qué hacer, en vez de dejar elegir un archivo que no se podría guardar.
   */
  onFotoRamo(evento: Event, r: IRamoArmado): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !r.varianteId || !r.varianteProductoId) return;

    this.subiendoFoto = r.id;
    this.imagenes
      .subirFoto({ id: r.varianteId, producto: { id: r.varianteProductoId } }, archivo)
      .subscribe({
        next: () => {
          this.imagenes.portadaDe(r.varianteId!).subscribe(url => {
            this.fotos[r.varianteId!] = url;
            this.subiendoFoto = null;
            Swal.fire({ icon: 'success', title: 'Foto guardada', timer: 1200, showConfirmButton: false });
          });
        },
        error: err => {
          this.subiendoFoto = null;
          Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar la foto',
            text: err?.error?.mensaje ?? err?.message ?? 'Intenta de nuevo.'
          });
        }
      });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargar();
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    forkJoin({
      tipos:      this.flores.tiposGetAll(),
      colores:    this.flores.coloresGetAll(),
      cantidades: this.flores.cantidadesGetAll(),
      accesorios: this.flores.accesoriosGetAll()
    }).subscribe({
      next: r => {
        this.tipos      = r.tipos;
        this.colores    = r.colores;
        this.cantidades = r.cantidades;
        this.accesorios = r.accesorios;
        this.cargandoCatalogos = false;
      },
      error: err => {
        this.cargandoCatalogos = false;
        this.error = this.msg(err, 'No se pudieron cargar los catálogos base.');
      }
    });
  }

  // ── Lista ────────────────────────────────────────────────────────────────

  cargar(): void {
    if (this.cargando) return;
    this.cargando = true;
    this.flores.ramosAdmin(this.pagina, this.size).subscribe({
      next: r => {
        this.ramos = r?.t ?? [];
        this.cargarFotos(this.ramos);
        this.totalPaginas = r?.totalPaginas ?? 1;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        this.error = this.msg(err, 'No se pudieron cargar los ramos.');
      }
    });
  }

  paginaAnterior(): void { if (this.pagina > 1) { this.pagina--; this.cargar(); } }
  paginaSiguiente(): void { if (this.pagina < this.totalPaginas) { this.pagina++; this.cargar(); } }

  toggleActivo(r: IRamoArmado): void {
    const nuevo = !r.activo;
    Swal.fire({
      icon: 'question',
      title: `¿${nuevo ? 'Activar' : 'Desactivar'} ramo?`,
      text: r.nombre,
      showCancelButton: true,
      confirmButtonText: `Sí, ${nuevo ? 'activar' : 'desactivar'}`,
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.flores.ramoToggleActivo(r.id, nuevo).subscribe({
        next: () => { r.activo = nuevo; },
        error: err => Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo cambiar el estado.') })
      });
    });
  }

  // ── Catálogos filtrados por especie elegida ────────────────────────────

  get coloresDeLaEspecie(): IColorFlor[] {
    return this.colores.filter(c => c.activo && c.tipoFlor?.id === this.formTipoFlorId);
  }

  get cantidadesDeLaEspecie(): ICantidadFlor[] {
    return this.cantidades.filter(c => c.activo && c.tipoFlor?.id === this.formTipoFlorId);
  }

  get accesoriosActivos(): IAccesorioRamo[] {
    return this.accesorios.filter(a => a.activo);
  }

  onCambiarEspecie(): void {
    // Al cambiar de especie, color y cantidad quedan inválidos — se limpian para que el admin
    // no confirme sin querer una combinación que ya no aparece en los selects filtrados.
    this.formColorFlorId = 0;
    this.formCantidadFlorValidaId = 0;
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  abrirNuevo(): void {
    this.modoForm = 'nuevo';
    this.editandoId = null;
    this.resetForm();
  }

  abrirEditar(r: IRamoArmado): void {
    this.modoForm = 'editar';
    this.editandoId = r.id;
    this.formNombre = r.nombre;
    this.formImagenUrl = r.imagenUrl ?? '';
    this.formActivo = r.activo;
    // El color ya nos dice la especie (tipoFlor viene anidado en IColorFlor del catálogo).
    const color = this.colores.find(c => c.id === r.colorFlorId);
    this.formTipoFlorId = color?.tipoFlor?.id ?? 0;
    this.formColorFlorId = r.colorFlorId;
    // La cantidad exacta del ramo no viaja en la respuesta (solo el total de flores calculado) —
    // se intenta preseleccionar la que coincide con `r.cantidad` dentro de la misma especie;
    // si no calza con ninguna cantidad válida activa, se deja sin preseleccionar.
    this.formCantidadFlorValidaId = this.cantidades.find(
      c => c.tipoFlor?.id === this.formTipoFlorId && c.cantidad === r.cantidad
    )?.id ?? 0;
    this.formAccesorios = this.accesoriosActivos.map(a => {
      const existente = r.accesorios?.find(x => x.accesorioId === a.id);
      return { accesorio: a, seleccionado: !!existente, cantidad: existente?.cantidad ?? 1 };
    });
  }

  cancelarForm(): void {
    this.modoForm = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.formNombre = '';
    this.formTipoFlorId = 0;
    this.formColorFlorId = 0;
    this.formCantidadFlorValidaId = 0;
    this.formImagenUrl = '';
    this.formActivo = true;
    this.formAccesorios = this.accesoriosActivos.map(a => ({ accesorio: a, seleccionado: false, cantidad: 1 }));
  }

  guardar(): void {
    if (!this.formNombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta el nombre', text: 'Escribe un nombre para el ramo.' });
      return;
    }
    if (!this.formColorFlorId) {
      Swal.fire({ icon: 'warning', title: 'Falta el color', text: 'Elige la especie y el color del ramo.' });
      return;
    }
    if (!this.formCantidadFlorValidaId) {
      Swal.fire({ icon: 'warning', title: 'Falta la cantidad', text: 'Elige cuántas flores lleva el ramo.' });
      return;
    }

    const accesorios: IRamoAccesorioRequest[] = this.formAccesorios
      .filter(s => s.seleccionado)
      .map(s => ({ accesorioId: s.accesorio.id, cantidad: s.cantidad || 1 }));

    this.guardando = true;
    const req: IRamoArmadoRequest = {
      nombre: this.formNombre.trim(),
      colorFlorId: this.formColorFlorId,
      cantidadFlorValidaId: this.formCantidadFlorValidaId,
      accesorios,
      imagenUrl: this.formImagenUrl.trim() || null,
      activo: this.formActivo
    };

    const obs = this.modoForm === 'editar' && this.editandoId
      ? this.flores.ramoEditar(this.editandoId, req)
      : this.flores.ramoCrear(req);

    obs.subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          icon: 'success',
          title: this.modoForm === 'editar' ? 'Ramo actualizado' : 'Ramo creado',
          timer: 1500,
          showConfirmButton: false
        });
        this.cancelarForm();
        this.cargar();
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', text: this.msg(err, 'No se pudo guardar el ramo.') });
      }
    });
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
