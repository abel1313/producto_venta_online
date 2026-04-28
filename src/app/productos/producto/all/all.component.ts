import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent } from 'ag-grid-community';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { IconService } from 'src/app/Icon/icon.service';
import { IDetalleProducto } from 'src/app/models';
import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTO, IProductoPaginable } from '../models';
@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss']
})
export class AllComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  @ViewChild('videoScanner') videoScanner!: ElementRef<HTMLVideoElement>;
  @Input() buscar?: string;
  @Input() paginacion?: IProductoPaginable<IProductoDTO[]>;
  @Input() itemAgregar?: string;
  @Input() itemEliminar?: string;
  @Input() styleTableWidth?: string = '100%';
  @Input() styleTableheight?: string = '400px';
  gridApi: any;

  public env: string = environment.api_imagenes + "/imagenes/buscarImagenProducto/";

  paginaPrimera: number = 1;
  paginaUltima: number = 0;
  totalPaginas: number = 0;

  rows: IProductoDTO[] = [];
  data: IProductoDTO[] = [];

  columns = [
    { field: 'nombre', headerName: 'Nombre' },
    { field: 'precioCosto', headerName: 'Precio Costo' },
    { field: 'piezas', headerName: 'Piezas' },
    { field: 'color', headerName: 'Color' },
    { field: 'precioVenta', headerName: 'Precio Venta' },
    { field: 'precioRebaja', headerName: 'Precio Rebaja' },
    { field: 'descripcion', headerName: 'Descripcion' },
    { field: 'stock', headerName: 'Stock' },
    { field: 'marca', headerName: 'Marca' },
    { field: 'contenido', headerName: 'Contenido' },
    { field: 'codigoBarras', headerName: 'Codigo Barras' },
  ];
  roles: string[] = [];
  isAdminUser: boolean = false;
  constructor(
    public iconImagen: IconService,
    private readonly router: Router,
    private readonly srvice: ProductoService,
    private readonly serviceCarrito: CarritoService,
    private readonly authService: AuthService
  ) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['paginacion'] && this.paginacion?.t) {
      this.rows = [...this.paginacion.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
    this.serviceCarrito.carritoDetalle$.subscribe(detalle => {
      this.detalle = detalle;
    });
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    
  }
  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }
  filaSeleccionada: any;
  blockContextMenu(event: MouseEvent) {
    event.preventDefault(); // ✅ Bloquea el menú del navegador
    event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
  }
  abrirMenu(event: CellContextMenuEvent<any>) {
    if (event.event instanceof MouseEvent) { // ✅ Verifica que sea un evento de ratón
      event.event.preventDefault(); // ✅ Bloquea el menú del navegador
      event.event.stopPropagation(); // ✅ Evita que otros eventos interfieran


      // 📌 Obtener el rectángulo de la celda seleccionada
      const cellElement = event.event.target as HTMLElement;
      const rect = cellElement.getBoundingClientRect();

      // ✅ Definir coordenadas dinámicas
      const x = rect.left + 'px';  // 📌 Posición horizontal según la celda seleccionada
      const y = rect.top + 'px';   // 📌 Posición vertical alineada con la celda


      setTimeout(() => {
        const overlayPane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
        if (overlayPane) {
          overlayPane.style.position = 'absolute';
          overlayPane.style.left = x;
          overlayPane.style.top = y;
        }
        this.menuTrigger.openMenu();
      }, 0);



    }




    this.filaSeleccionada = event.data; // ✅ Obtiene la fila seleccionada

    //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual

    if (this.menuTrigger) { // ✅ Verifica que `menuTrigger` no es undefined

      this.menuTrigger.openMenu();

    } else {
      console.error('menuTrigger no está inicializado');
    }
  }


  addCarrito(producto: IProductoDTO) {
    const { idProducto, nombre, descripcion, stock, precioVenta, codigoBarras } = producto;
    const prod = {
      idProducto,
      nombre,
      descripcion,
      stock,
      precioVenta,
      codigoBarras,
      cantidad: 1,
      total: precioVenta
    };

    const agregado = this.serviceCarrito.agregarProducto(prod);
    if (!agregado) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin stock disponible',
        text: `Solo hay ${stock} unidad${stock === 1 ? '' : 'es'} disponibles de "${nombre}".`,
        confirmButtonColor: '#3085d6'
      });
    }
  }

  cantidadEnCarrito(producto: IProductoDTO): number {
    return this.detalle.find(p => p.codigoBarras === producto.codigoBarras)?.cantidad ?? 0;
  }

  stockAgotadoEnCarrito(producto: IProductoDTO): boolean {
    return this.cantidadEnCarrito(producto) >= producto.stock;
  }


  removeCarrito(producto: IProductoDTO) {
    const index = this.detalle.findIndex(item =>
      item.codigoBarras === producto.codigoBarras && item.nombre === producto.nombre
    );

    this.serviceCarrito.eliminarProducto(this.detalle[index]);
  }
  isProductoEnCarrito(producto: IProductoDTO): boolean {
    return this.detalle.some(item =>
      item.codigoBarras === producto.codigoBarras && item.nombre === producto.nombre
    );
  }

  detalle: IDetalleProducto[] = [];
  agregarFila() {

    const { id, nombre, descripcion, stock, precioVenta, codigoBarras } = this.filaSeleccionada;
    let cant = 1;
    const prod = {
      idProducto: id,
      nombre,
      descripcion,
      stock,
      precioVenta,
      codigoBarras,
      cantidad: cant,
      total: 0
    }

    // Asegurar que detalle es un array y luego agregar el nuevo producto
    if (!Array.isArray(this.detalle)) {
      this.detalle = [];
    }

    // Buscar si ya existe el producto
    const index = this.detalle.findIndex(item => item.codigoBarras === prod.codigoBarras && item.nombre === prod.nombre);

    if (index !== -1) {
      // Si existe, incrementar la cantidad y actualizar el total
      this.detalle[index].cantidad += 1;
    } else {
      // Si no existe, agregarlo a la lista
      this.detalle.push(prod);
    }

    // Calcular el total de cada producto
    this.detalle.forEach(item => item.total = item.cantidad * item.precioVenta);


  }

  eliminarFila() {
    this.rows = this.rows.filter(row => row !== this.filaSeleccionada);
  }

  updateProducto(item: any) {
    this.router.navigate(['productos/update']);
    this.srvice.agregarProducto(item);
  }
  ngAfterViewInit() {

    if (!this.menuTrigger) {
      console.error('menuTrigger no está inicializado');
    }

    const button = document.getElementById('menuTrigger');
    if (button) {
      button.setAttribute("style", "background-color: red !important;");
    }



  }

  ngOnInit(): void {
    if (this.srvice.prodInitialized) {
      // Restaurar estado previo sin nueva petición
      this.buscarProd    = this.srvice.prodTerminoCache;
      this.rows          = [...this.srvice.prodCache];
      this.totalPaginas  = this.srvice.prodTotalCache;
      this.paginaPrimera = this.srvice.prodPaginaCache;
    } else {
      this.getData(1);
    }
  }

  getData(pagina: number) {
    this.srvice.getData(pagina, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.paginacion = res;
        this.rows = this.paginacion.t;
        this.totalPaginas = this.paginacion.totalPaginas;
        this.srvice.setProdCache(this.rows, pagina, this.totalPaginas, '');
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      }
    });
  }

  primeraPagina(): void {
    this.paginaPrimera = 1;


    this.conOSinBuscar(this.paginaPrimera);
    console.error('EprimeraPagina:', this.paginaPrimera);
  }
  paginaAnterior(): void {
    this.paginaPrimera = this.paginaPrimera - 1;
    this.conOSinBuscar(this.paginaPrimera);

  }
  siguientePagina(): void {
    this.paginaPrimera = this.paginaPrimera + 1;
    this.conOSinBuscar(this.paginaPrimera);

  }
  ultimaPagina(): void {
    this.paginaUltima = this.paginacion?.totalPaginas || 0;
    this.paginaPrimera = this.paginacion?.totalPaginas || 0;
    this.conOSinBuscar(this.paginaUltima);
    console.error('ultimaPagina:', this.paginaUltima);
  }


  conOSinBuscar(pagina: number): void {
    if (this.buscarProd == '') {
      this.getData(pagina);
    } else {
      this.buscarProductoSinKey(pagina, this.buscarProd,);
    }
  }
  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    //this.paginaPrimera = 1;
    this.buscarProd = texto;
    if (this.buscarProd == '') {
      this.paginaPrimera = 1;
    }
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

  buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    // Si el término y la página ya están en caché, no repetir la petición
    if (
      this.srvice.prodInitialized &&
      this.srvice.prodTerminoCache  === buscarProd &&
      this.srvice.prodPaginaCache   === paginaPrimera
    ) return;

    this.srvice.getDataNombreCodigoBarra(paginaPrimera, 10, buscarProd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paginacion = res;
          this.rows = this.paginacion.t;
          this.totalPaginas = res.totalPaginas ?? 0;
          this.srvice.setProdCache(this.rows, paginaPrimera, this.totalPaginas, buscarProd);
        },
        error: (err) => {
          console.error('Error en la petición:', err);
        }
      });
  }

  buscarProductoScroll(paginaPrimera: number): void {
    if( this.totalPaginas >= paginaPrimera){
    this.srvice.getDataNombreCodigoBarra(paginaPrimera, 10, "")
      .subscribe({
        next: (res) => {
          this.paginaPrimera = this.paginaPrimera +1;
          this.paginacion = res;
          this.rows = [...this.rows, ...this.paginacion.t]; // Agrega sin borrar los anteriores
        },
        error: (err) => {
          console.error('Error en la petición:', err);
        }
      });
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMore(); // Carga más datos
    }
  }

  trackById(index: number, item: any): number {
    return item.id;
  }
  loadMore(): void {
    this.buscarProductoScroll(this.paginaPrimera + 1);
  }
  irDetalleProducto(id: number) {
    this.router.navigate(['/productos/detalle-producto', id]);
  }

  verCarrito(): void {
    this.router.navigate(['/productos/detalle-productos']);
  }

  imageSrc(item: IProductoDTO): string | null {
    const img = (item as any).imagen;
    if (!img?.imagen) return null;
    return `data:${img.contentType};base64,${img.imagen}`;
  }

  colorHeader(color: string): string {
    const map: Record<string, string> = {
      negro:    'linear-gradient(135deg,#424242,#616161)',
      azul:     'linear-gradient(135deg,#1e88e5,#42a5f5)',
      rojo:     'linear-gradient(135deg,#e53935,#ef5350)',
      blanco:   'linear-gradient(135deg,#78909c,#90a4ae)',
      verde:    'linear-gradient(135deg,#43a047,#66bb6a)',
      amarillo: 'linear-gradient(135deg,#fb8c00,#ffa726)',
      gris:     'linear-gradient(135deg,#546e7a,#78909c)',
      rosa:     'linear-gradient(135deg,#e91e63,#f06292)',
      morado:   'linear-gradient(135deg,#7b1fa2,#ab47bc)',
      naranja:  'linear-gradient(135deg,#f4511e,#ff7043)',
      cafe:     'linear-gradient(135deg,#6d4c41,#8d6e63)',
    };
    return map[(color ?? '').toLowerCase().trim()]
      ?? 'linear-gradient(135deg,#8b1a4a,#c2255c)';
  }

  stockClase(stock: number): string {
    if (stock === 0) return 'badge bg-danger';
    if (stock <= 3)  return 'badge bg-warning text-dark';
    return 'badge bg-success';
  }

  get totalEnCarrito(): number {
    return this.detalle.reduce((sum, item) => sum + item.cantidad, 0);
  }

  buscarProd: string = '';
  private destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  escaneando = false;
  private controlesEscaner: IScannerControls | null = null;

  async iniciarEscaner() {
    this.escaneando = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      const reader = new BrowserMultiFormatReader();
      this.controlesEscaner = await reader.decodeFromVideoDevice(
        undefined,
        this.videoScanner.nativeElement,
        (result, _err, controls) => {
          if (result) {
            const codigo = result.getText();
            this.buscarProd = codigo;
            this.buscarProductoSinKey(1, codigo);
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

  detenerEscaner() {
    this.controlesEscaner?.stop();
    this.controlesEscaner = null;
    this.escaneando = false;
  }
}


