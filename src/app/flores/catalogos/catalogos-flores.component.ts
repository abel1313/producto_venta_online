import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import {
  IAccesorioRamo, ICantidadFlor, IColorFlor, IFraseListon, ITipoFlor
} from '../models/flores.model';
import { FloresService } from '../service/flores.service';

type Tab = 'tipos' | 'colores' | 'cantidades' | 'accesorios' | 'frases';

@Component({
  selector: 'app-catalogos-flores',
  templateUrl: './catalogos-flores.component.html',
  styleUrls: ['./catalogos-flores.component.scss']
})
export class CatalogosFloresComponent implements OnInit {

  tab: Tab = 'tipos';

  tipos: ITipoFlor[] = [];
  colores: IColorFlor[] = [];
  cantidades: ICantidadFlor[] = [];
  accesorios: IAccesorioRamo[] = [];
  frases: IFraseListon[] = [];

  cargando = false;
  /** Guard de re-entrada: se libera solo al terminar la recarga, no en el next de la mutación. */
  guardando = false;
  error: string | null = null;

  // Altas
  nuevoTipo       = { nombre: '', precioPorFlor: 0 };
  nuevaCantidad   = { tipoFlorId: 0, cantidad: 0 };
  nuevoColor      = { tipoFlorId: 0, nombre: '', stock: 0 };
  nuevoAccesorio  = { nombre: '', precio: 0, admiteTextoLibre: false, esPapel: false, umbralActivacion: null as number | null };
  nuevaFrase      = { texto: '', precio: 0 };

  // Edición en línea
  editandoId: number | null = null;
  editTipo:      ITipoFlor      | null = null;
  editColor:     IColorFlor     | null = null;
  editCantidad:  ICantidadFlor  | null = null;
  editAccesorio: IAccesorioRamo | null = null;
  editFrase:     IFraseListon   | null = null;

  constructor(private readonly flores: FloresService) {}

  ngOnInit(): void { this.cargar(); }

  setTab(t: Tab): void { this.tab = t; this.cancelarEdicion(); }

  /**
   * Se cargan los 4 catálogos juntos aunque solo se vea uno: son listas chicas, y el alta de
   * cantidades necesita los tipos de flor para su selector. Traerlos por separado obligaría a
   * recargar al cambiar de pestaña.
   */
  cargar(): void {
    this.cargando = true;
    this.error = null;
    forkJoin({
      tipos:      this.flores.tiposGetAll(),
      colores:    this.flores.coloresGetAll(),
      cantidades: this.flores.cantidadesGetAll(),
      accesorios: this.flores.accesoriosGetAll(),
      frases:     this.flores.frasesGetAll()
    }).subscribe({
      next: r => {
        this.tipos      = r.tipos;
        this.colores    = r.colores;
        this.cantidades = r.cantidades;
        this.accesorios = r.accesorios;
        this.frases     = r.frases;
        this.cargando   = false;
      },
      error: err => {
        this.cargando = false;
        this.error = this.msg(err, 'No se pudieron cargar los catálogos de flores.');
      }
    });
  }

  /** Ya hay un accesorio marcado como papel — el back espera máximo uno activo a la vez. */
  get yaHayPapel(): boolean {
    return this.accesorios.some(a => a.esPapel && a.activo);
  }

  get tiposActivos(): ITipoFlor[] { return this.tipos.filter(t => t.activo); }

  nombreTipo(id: number): string {
    return this.tipos.find(t => t.id === id)?.nombre ?? '—';
  }

  // ── Altas ──────────────────────────────────────────────────────────────────

  agregarTipo(): void {
    const n = this.nuevoTipo.nombre.trim();
    if (!n || this.nuevoTipo.precioPorFlor <= 0 || this.guardando) return;
    this.ejecutar(
      this.flores.tipoSave({ nombre: n, precioPorFlor: this.nuevoTipo.precioPorFlor, activo: true }),
      () => { this.nuevoTipo = { nombre: '', precioPorFlor: 0 }; },
      'No se pudo agregar el tipo de flor.'
    );
  }

  agregarColor(): void {
    const n = this.nuevoColor.nombre.trim();
    if (!this.nuevoColor.tipoFlorId || !n || this.guardando) return;
    this.ejecutar(
      this.flores.colorSave({ tipoFlor: { id: this.nuevoColor.tipoFlorId }, nombre: n, stock: this.nuevoColor.stock, activo: true }),
      () => { this.nuevoColor = { tipoFlorId: 0, nombre: '', stock: 0 }; },
      'No se pudo agregar el color.'
    );
  }

  agregarCantidad(): void {
    const { tipoFlorId, cantidad } = this.nuevaCantidad;
    if (!tipoFlorId || cantidad <= 0 || this.guardando) return;
    this.ejecutar(
      this.flores.cantidadSave({ tipoFlor: { id: tipoFlorId }, cantidad, activo: true }),
      () => { this.nuevaCantidad = { tipoFlorId: 0, cantidad: 0 }; },
      'No se pudo agregar la cantidad.'
    );
  }

  agregarAccesorio(): void {
    const n = this.nuevoAccesorio.nombre.trim();
    if (!n || this.nuevoAccesorio.precio < 0 || this.guardando) return;
    this.ejecutar(
      this.flores.accesorioSave({ ...this.nuevoAccesorio, nombre: n, activo: true }),
      () => { this.nuevoAccesorio = { nombre: '', precio: 0, admiteTextoLibre: false, esPapel: false, umbralActivacion: null }; },
      'No se pudo agregar el accesorio.'
    );
  }

  agregarFrase(): void {
    const t = this.nuevaFrase.texto.trim();
    if (!t || this.nuevaFrase.precio < 0 || this.guardando) return;
    this.ejecutar(
      this.flores.fraseSave({ texto: t, precio: this.nuevaFrase.precio, activo: true }),
      () => { this.nuevaFrase = { texto: '', precio: 0 }; },
      'No se pudo agregar la frase.'
    );
  }

  // ── Edición ────────────────────────────────────────────────────────────────

  editar(item: ITipoFlor | IColorFlor | ICantidadFlor | IAccesorioRamo | IFraseListon): void {
    this.editandoId = item.id;
    this.editTipo      = this.tab === 'tipos'      ? { ...(item as ITipoFlor) }      : null;
    this.editColor     = this.tab === 'colores'    ? { ...(item as IColorFlor) }     : null;
    this.editCantidad  = this.tab === 'cantidades' ? { ...(item as ICantidadFlor) }  : null;
    this.editAccesorio = this.tab === 'accesorios' ? { ...(item as IAccesorioRamo) } : null;
    this.editFrase     = this.tab === 'frases'     ? { ...(item as IFraseListon) }   : null;
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.editTipo = this.editColor = this.editCantidad = this.editAccesorio = this.editFrase = null;
  }

  guardarEdicion(): void {
    if (this.guardando) return;
    let accion: Observable<unknown> | null = null;

    if (this.editTipo && this.editTipo.nombre.trim()) {
      accion = this.flores.tipoUpdate(this.editTipo);
    } else if (this.editColor && this.editColor.nombre.trim() && this.editColor.tipoFlor) {
      accion = this.flores.colorUpdate({
        id: this.editColor.id,
        tipoFlor: { id: this.editColor.tipoFlor.id },
        nombre: this.editColor.nombre.trim(),
        stock: this.editColor.stock,
        activo: this.editColor.activo
      });
    } else if (this.editCantidad && this.editCantidad.cantidad > 0 && this.editCantidad.tipoFlor) {
      accion = this.flores.cantidadUpdate({
        id: this.editCantidad.id,
        tipoFlor: { id: this.editCantidad.tipoFlor.id },
        cantidad: this.editCantidad.cantidad,
        activo: this.editCantidad.activo
      });
    } else if (this.editAccesorio && this.editAccesorio.nombre.trim()) {
      accion = this.flores.accesorioUpdate(this.editAccesorio);
    } else if (this.editFrase && this.editFrase.texto.trim()) {
      accion = this.flores.fraseUpdate(this.editFrase);
    }

    if (!accion) return;
    this.ejecutar(accion, () => this.cancelarEdicion(), 'No se pudo guardar el cambio.');
  }

  toggleActivo(item: ITipoFlor | IColorFlor | ICantidadFlor | IAccesorioRamo | IFraseListon): void {
    if (this.guardando) return;
    const activo = !item.activo;
    let accion: Observable<unknown>;

    switch (this.tab) {
      case 'tipos':      accion = this.flores.tipoUpdate({ ...(item as ITipoFlor), activo }); break;
      case 'colores': {
        const co = item as IColorFlor;
        if (!co.tipoFlor) return;   // renglón inconsistente: sin especie no se puede reenviar
        accion = this.flores.colorUpdate({ id: co.id, tipoFlor: { id: co.tipoFlor.id }, nombre: co.nombre, stock: co.stock, activo });
        break;
      }
      case 'cantidades': {
        const c = item as ICantidadFlor;
        if (!c.tipoFlor) return;   // renglón inconsistente: sin tipo no se puede reenviar
        accion = this.flores.cantidadUpdate({ id: c.id, tipoFlor: { id: c.tipoFlor.id }, cantidad: c.cantidad, activo });
        break;
      }
      case 'accesorios': accion = this.flores.accesorioUpdate({ ...(item as IAccesorioRamo), activo }); break;
      default:           accion = this.flores.fraseUpdate({ ...(item as IFraseListon), activo }); break;
    }
    this.ejecutar(accion, undefined, 'No se pudo cambiar el estado.');
  }

  eliminar(item: { id: number }, etiqueta: string): void {
    if (this.guardando) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar?',
      text: etiqueta,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      let accion: Observable<unknown>;
      switch (this.tab) {
        case 'tipos':      accion = this.flores.tipoDelete(item.id); break;
        case 'colores':    accion = this.flores.colorDelete(item.id); break;
        case 'cantidades': accion = this.flores.cantidadDelete(item.id); break;
        case 'accesorios': accion = this.flores.accesorioDelete(item.id); break;
        default:           accion = this.flores.fraseDelete(item.id); break;
      }
      this.ejecutar(accion, undefined, 'No se pudo eliminar.');
    });
  }

  // ── Interno ────────────────────────────────────────────────────────────────

  private ejecutar(accion: Observable<unknown>, alExito: (() => void) | undefined, fallback: string): void {
    this.guardando = true;
    accion.subscribe({
      next: () => {
        if (alExito) alExito();
        // La recarga es parte de la cadena: `guardando` no se libera antes de que termine,
        // si no un segundo clic reenviaría lo mismo con datos ya guardados.
        this.recargarTodo();
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, fallback) });
      }
    });
  }

  private recargarTodo(): void {
    forkJoin({
      tipos:      this.flores.tiposGetAll(),
      colores:    this.flores.coloresGetAll(),
      cantidades: this.flores.cantidadesGetAll(),
      accesorios: this.flores.accesoriosGetAll(),
      frases:     this.flores.frasesGetAll()
    }).subscribe({
      next: r => {
        this.tipos      = r.tipos;
        this.colores    = r.colores;
        this.cantidades = r.cantidades;
        this.accesorios = r.accesorios;
        this.frases     = r.frases;
        this.guardando  = false;
      },
      error: err => {
        this.guardando = false;
        this.error = this.msg(err, 'Se guardó, pero no se pudo refrescar la lista.');
      }
    });
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
