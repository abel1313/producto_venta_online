import { Component, HostListener, OnInit } from '@angular/core';
import { MaskCellRendererComponent } from './mask-cell-renderer.component';
import { CellContextMenuEvent } from 'ag-grid-community';
import { IProductoDTO, IProductoPaginable } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { IUsuario, IVenta } from '../models';
import { IDetalleVenta } from '../models/detalleVenta.mode';
import { PagoService } from 'src/app/pedidos/pago.service';
import { IOpcionMesesDto, IOpcionPagoDto } from 'src/app/pedidos/mis-pedidos/models/IPago.model';
import { IVentaDirectaRequest } from '../models/ventaDirectaRequest.model';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-venta',
  templateUrl: './add-venta.component.html',
  styleUrls: ['./add-venta.component.scss']
})
export class AddVentaComponent implements OnInit {

  rowsBuscador: any[] = [];
  buscarProd: string = '';
  paginacionBuscador?: IProductoPaginable<IProductoDTO[]>;

  rowsDetalle: any[] = [];
  detalleVenta: IDetalleVenta[] = [];
  totalDetalle: string = 'Total ';
  disableBoton: boolean = false;

  filaSeleccionadaBuscador: any;
  filaSeleccionadaBuscadorIndex: any;
  filaSeleccionadaDetalle: any;

  // ─── Menús contextuales ───────────────────────────────────────
  menuBuscadorVisible = false;
  menuBuscadorX = '0px';
  menuBuscadorY = '0px';

  menuDetalleVisible = false;
  menuDetalleX = '0px';
  menuDetalleY = '0px';

  @HostListener('document:click')
  cerrarMenus() {
    this.menuBuscadorVisible = false;
    this.menuDetalleVisible = false;
  }

  // ─── Columnas ─────────────────────────────────────────────────
  columnsBuscador = [
    { field: 'nombre',       headerName: 'Nombre' },
    { field: 'codigoBarras', headerName: 'Codigo Barras' },
    { field: 'precioVenta',  headerName: 'Precio Venta' },
    { field: 'stock',        headerName: 'Stock' },
    { field: 'piezas',       headerName: 'Piezas' },
    { field: 'color',        headerName: 'Color' },
    { field: 'precioCosto',  headerName: 'Precio Costo',  cellRenderer: MaskCellRendererComponent },
    { field: 'precioRebaja', headerName: 'Precio Rebaja', cellRenderer: MaskCellRendererComponent },
    { field: 'descripcion',  headerName: 'Descripcion' },
    { field: 'marca',        headerName: 'Marca' },
    { field: 'contenido',    headerName: 'Contenido' }
  ];

  columnsDetalle = [
    { field: 'nombre',       headerName: 'Nombre' },
    { field: 'descripcion',  headerName: 'Descripcion' },
    { field: 'precioVenta',  headerName: 'Precio Venta' },
    { field: 'codigoBarras', headerName: 'Codigo Barras' },
    { field: 'cantidad',     headerName: 'Cantidad' },
    { field: 'subTotal',     headerName: 'Sub total' }
  ];

  // ─── Modal de pago ───────────────────────────────────────────
  mostrarDialogoPago = false;
  opcionesEstructuradas: IOpcionPagoDto[] = [];
  tipoPagoActivo: IOpcionPagoDto | null = null;
  mesesSeleccionado: IOpcionMesesDto | null = null;
  pagosYMesesId: number | null = null;

  get puedeConfirmar(): boolean {
    return this.pagosYMesesId !== null;
  }

  private usuarioId = 0;

  constructor(
    private readonly service: ProductoService,
    private readonly pagoService: PagoService,
    private readonly authService: AuthService
  ) {
    this.authService.userId$.subscribe(id => this.usuarioId = id);
  }

  ngOnInit(): void {
    this.getDataBuscador(1);
  }

  // ─── Tabla buscador ───────────────────────────────────────────

  getDataBuscador(pagina: number) {
    this.service.getData(pagina, 10).subscribe({
      next: res => { this.paginacionBuscador = res; this.rowsBuscador = res.t; },
      error: err => console.error(err)
    });
  }

  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;
    this.service.getDataNombreCodigoBarra(1, 10, texto).subscribe({
      next: res => { this.paginacionBuscador = res; this.rowsBuscador = res.t; },
      error: err => console.error(err)
    });
  }

  blockContextMenuBuscador(event: MouseEvent) {
    event.preventDefault();
  }

  abrirMenuBuscador(event: CellContextMenuEvent<any>) {
    if (!(event.event instanceof MouseEvent)) return;
    event.event.preventDefault();
    event.event.stopPropagation();

    this.filaSeleccionadaBuscador = event.data;
    this.filaSeleccionadaBuscadorIndex = event.rowIndex;

    this.menuDetalleVisible = false;
    this.menuBuscadorX = event.event.clientX + 'px';
    this.menuBuscadorY = event.event.clientY + 'px';
    this.menuBuscadorVisible = true;
  }

  agregarFilaBuscador() {
    this.menuBuscadorVisible = false;
    const index: number = this.filaSeleccionadaBuscadorIndex ?? 0;

    if (index < 0 || index >= this.rowsBuscador.length) return;
    if (this.rowsBuscador[index].stock <= 0) {
      Swal.fire({ icon: 'warning', title: 'Sin stock', text: 'Este producto no tiene stock disponible.' });
      return;
    }

    this.rowsBuscador[index].stock -= 1;
    this.rowsBuscador = [...this.rowsBuscador];

    const { nombre, descripcion, stock, precioVenta, codigoBarras } = this.filaSeleccionadaBuscador;
    const prod: IDetalleVenta = { nombre, descripcion, stock, precioVenta, codigoBarras, cantidad: 1, subTotal: 0 };

    const existente = this.detalleVenta.findIndex(i => i.codigoBarras === prod.codigoBarras && i.nombre === prod.nombre);
    if (existente !== -1) {
      this.detalleVenta[existente].cantidad += 1;
    } else {
      this.detalleVenta.push(prod);
    }

    this.detalleVenta.forEach(i => i.subTotal = i.cantidad * i.precioVenta);
    this.rowsDetalle = [...this.detalleVenta];
    const total = this.detalleVenta.reduce((s, i) => s + i.subTotal, 0);
    this.totalDetalle = 'Total $ ' + total.toFixed(2);
    this.disableBoton = total > 0;
  }

  // ─── Tabla detalle ────────────────────────────────────────────

  blockContextMenuDetalle(event: MouseEvent) {
    event.preventDefault();
  }

  abrirMenuDetalle(event: CellContextMenuEvent<any>) {
    if (!(event.event instanceof MouseEvent)) return;
    event.event.preventDefault();
    event.event.stopPropagation();

    this.filaSeleccionadaDetalle = event.data;

    this.menuBuscadorVisible = false;
    this.menuDetalleX = event.event.clientX + 'px';
    this.menuDetalleY = event.event.clientY + 'px';
    this.menuDetalleVisible = true;
  }

  eliminarFilaDetalle() {
    this.menuDetalleVisible = false;
    const eliminado = this.filaSeleccionadaDetalle;

    // Regresar stock a tabla 1
    const idx = this.rowsBuscador.findIndex(r => r.codigoBarras === eliminado.codigoBarras);
    if (idx !== -1) {
      this.rowsBuscador[idx].stock += eliminado.cantidad;
    } else {
      // Si fue eliminado de la tabla porque stock llegó a 0, lo re-agrega
      this.rowsBuscador.push({
        nombre: eliminado.nombre,
        descripcion: eliminado.descripcion,
        precioVenta: eliminado.precioVenta,
        codigoBarras: eliminado.codigoBarras,
        stock: eliminado.cantidad
      });
    }
    this.rowsBuscador = [...this.rowsBuscador];

    // Quitar de detalle
    this.detalleVenta = this.detalleVenta.filter(r => r !== eliminado);
    this.rowsDetalle = [...this.detalleVenta];
    const total = this.detalleVenta.reduce((s, i) => s + i.subTotal, 0);
    this.totalDetalle = total > 0 ? 'Total $ ' + total.toFixed(2) : 'Total ';
    this.disableBoton = total > 0;
  }

  // ─── Modal de pago ───────────────────────────────────────────

  abrirDialogoPago(): void {
    if (!this.disableBoton) {
      Swal.fire({ icon: 'warning', title: 'Sin productos', text: 'Agrega al menos un producto.' });
      return;
    }
    this.resetDialogo();
    this.pagoService.getOpcionesEstructuradas().subscribe(res => {
      this.opcionesEstructuradas = res.data ?? [];
      this.mostrarDialogoPago = true;
    });
  }

  cancelarDialogoPago(): void {
    this.mostrarDialogoPago = false;
    this.resetDialogo();
  }

  seleccionarTipoPago(opcion: IOpcionPagoDto): void {
    this.tipoPagoActivo = opcion;
    this.mesesSeleccionado = null;
    this.pagosYMesesId = opcion.mostrarMeses ? null : opcion.pagosYMesesId;
  }

  seleccionarMeses(opcion: IOpcionMesesDto): void {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId = opcion.pagosYMesesId;
  }

  confirmarPago(): void {
    this.mostrarDialogoPago = false;
    const request: IVentaDirectaRequest = {
      usuarioId: this.usuarioId,
      pagosYMesesId: this.pagosYMesesId!,
      detalles: this.detalleVenta
    };
    this.service.saveVenta(request).subscribe({
      next: () => {
        Swal.fire({ title: 'Venta guardada correctamente', icon: 'success', draggable: true });
        this.detalleVenta = [];
        this.rowsDetalle  = [];
        this.totalDetalle = 'Total ';
        this.disableBoton = false;
        this.resetDialogo();
        this.getDataBuscador(1);
      },
      error: () => {
        this.mostrarDialogoPago = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al guardar la venta.' });
      }
    });
  }

  private resetDialogo(): void {
    this.opcionesEstructuradas = [];
    this.tipoPagoActivo = null;
    this.mesesSeleccionado = null;
    this.pagosYMesesId = null;
  }
}
