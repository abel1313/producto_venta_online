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
import { VarianteService } from 'src/app/variante/service/variante.service';
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
  filtroActivo: 'todos' | 'no-habilitados' | 'sin-stock' = 'todos';
  sinResultados = false;
  mensajeError  = '';

  constructor(
    public iconImagen: IconService,
    private readonly router: Router,
    private readonly srvice: ProductoService,
    private readonly varianteService: VarianteService,
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

    confirmarEliminarBatch(item: IProductoDTO): void {
    
      Swal.fire({
        title: `¿Eliminar este producto ${item.nombre}?`,
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        background: '#1e1b4b',
        color: '#fff'
      }).then(result => {
        if (!result.isConfirmed) return;
            this.srvice.deleteProductoPorId(item.idProducto).subscribe({
              next: () => {
                this.srvice.getData(1, 10).subscribe({
                  next: (res) => {                    this.paginacion = res;
                    this.rows = this.paginacion.t;
                    this.totalPaginas = this.paginacion.totalPaginas;
                    this.srvice.setProdCache(this.rows, 1, this.totalPaginas, '');
                  },
                  error: (err) => {
                    console.error('Error en la petición:', err);
                  }
                });
                Swal.fire({ icon: 'success', title: 'El producto se elimino correctamente', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
              },
              error: () => {
                Swal.fire({ icon: 'error', title: 'Error al eliminar el producto', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
              }
            });
      });
    }

    estaMarcada(img: IProductoDTO): boolean {
      return !!img.idProducto && this.imagenesParaEliminar.has(img.idProducto);
    }

  imagenesParaEliminar = new Set<number>();
  toggleMarcar(img: IProductoDTO): void {
      if (!img.idProducto) return;
      if (this.imagenesParaEliminar.has(img.idProducto)) {
        this.imagenesParaEliminar.delete(img.idProducto);
      } else {
        this.imagenesParaEliminar.add(img.idProducto);
      }
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
        this.sinResultados = false;
        this.paginacion = res;
        this.rows = this.paginacion.t;
        this.totalPaginas = this.paginacion.totalPaginas;
        this.srvice.setProdCache(this.rows, pagina, this.totalPaginas, '');
      },
      error: (err) => {
        if (err.status === 404) {
          this.rows = [];
          this.totalPaginas = 0;
          this.sinResultados = true;
          this.srvice.setProdCache([], pagina, 0, '');
        } else {
          console.error('Error en la petición:', err);
        }
      }
    });
  }

  cambiarFiltro(filtro: 'todos' | 'no-habilitados' | 'sin-stock'): void {
    if (this.filtroActivo === filtro) return;
    this.filtroActivo = filtro;
    this.buscarProd = '';
    this.sinResultados = false;
    this.srvice.invalidarProdCache();
    this.paginaPrimera = 1;
    if (filtro === 'todos') {
      this.getData(1);
    } else if (filtro === 'no-habilitados') {
      this.cargarNoHabilitados(1);
    } else {
      this.cargarSinStock(1);
    }
  }

  private cargarNoHabilitados(pagina: number): void {
    this.srvice.getNoHabilitados(pagina, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.sinResultados = false;
        this.rows = res.t;
        this.totalPaginas = res.totalPaginas;
        this.paginaPrimera = pagina;
      },
      error: (err) => {
        if (err.status === 404) { this.rows = []; this.totalPaginas = 0; this.sinResultados = true; }
      }
    });
  }

  private cargarSinStock(pagina: number): void {
    this.srvice.getSinStock(pagina, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.sinResultados = false;
        this.rows = res.t;
        this.totalPaginas = res.totalPaginas;
        this.paginaPrimera = pagina;
      },
      error: (err) => {
        if (err.status === 404) { this.rows = []; this.totalPaginas = 0; this.sinResultados = true; }
      }
    });
  }

  habilitarProducto(item: IProductoDTO, habilitar: boolean): void {
    this.srvice.habilitarProducto(item.idProducto, habilitar).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        item.habilitado = habilitar;
        Swal.fire({ icon: 'success', title: habilitar ? 'Producto habilitado' : 'Producto deshabilitado', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error al cambiar estado', timer: 1800, showConfirmButton: false })
    });
  }

  descargarExcel(): void {
    this.srvice.descargarReporteExcel().pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'productos_sin_variantes.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => Swal.fire({ icon: 'error', title: 'No se pudo descargar el reporte', timer: 2000, showConfirmButton: false })
    });
  }

  async inicializarVariantes(producto: IProductoDTO): Promise<void> {
    const { value: formValues } = await Swal.fire({
      title: `Inicializar variantes`,
      html: `
        <p style="margin:0 0 12px;font-size:0.9rem;color:#666;">Producto: <b>${producto.nombre}</b> — Stock disponible: <b>${producto.stock}</b></p>
        <label style="display:block;text-align:left;font-size:0.85rem;margin-bottom:4px;">Cantidad de variantes:</label>
        <input id="swal-cantidad" type="number" min="1" max="${producto.stock}" value="1"
          class="swal2-input" style="margin:0 0 12px;" />
        <label style="display:flex;align-items:center;gap:8px;text-align:left;font-size:0.85rem;margin-bottom:12px;cursor:pointer;">
          <input id="swal-para-todas" type="checkbox" style="width:16px;height:16px;" />
          Misma imagen para todas las variantes
        </label>
        <label style="display:block;text-align:left;font-size:0.85rem;margin-bottom:4px;">Imágenes (opcional):</label>
        <input id="swal-imagenes" type="file" multiple accept="image/*" class="swal2-file" style="margin:0;" />
      `,
      confirmButtonText: 'Crear variantes',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      confirmButtonColor: '#8b1a4a',
      background: '#fff',
      preConfirm: () => {
        const cantidad = parseInt((document.getElementById('swal-cantidad') as HTMLInputElement).value, 10);
        if (!cantidad || cantidad < 1) { Swal.showValidationMessage('Ingresa al menos 1 variante'); return false; }
        if (cantidad > producto.stock) { Swal.showValidationMessage(`El stock máximo es ${producto.stock}`); return false; }
        return {
          cantidadVariantes: cantidad,
          imagenParaTodas: (document.getElementById('swal-para-todas') as HTMLInputElement).checked,
          files: (document.getElementById('swal-imagenes') as HTMLInputElement).files
        };
      }
    });

    if (!formValues) return;

    const form = new FormData();
  form.append(
    'request',
    new Blob([JSON.stringify({
      productoId: producto.idProducto,
      cantidadVariantes: formValues.cantidadVariantes,
      imagenParaTodas: formValues.imagenParaTodas
    })], { type: 'application/json' })
  );
    if (formValues.files) {
      Array.from(formValues.files as FileList).forEach(f => form.append('files[]', f));
    }

    this.varianteService.inicializarDesdeProducto(form).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        Swal.fire({ icon: 'success', title: `${res.data.length} variante(s) creada(s)`, timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        this.getData(this.paginaPrimera);
      },
      error: (err) => Swal.fire({ icon: 'error', title: 'Error al crear variantes', text: err?.error?.message ?? 'Intenta de nuevo', confirmButtonColor: '#8b1a4a' })
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
    if (this.filtroActivo === 'no-habilitados') { this.cargarNoHabilitados(pagina); return; }
    if (this.filtroActivo === 'sin-stock') { this.cargarSinStock(pagina); return; }
    if (this.buscarProd === '') {
      this.getData(pagina);
    } else {
      this.buscarProductoSinKey(pagina, this.buscarProd);
    }
  }
  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;
    if (this.buscarProd === '') {
      this.paginaPrimera  = 1;
      this.sinResultados  = false;
      this.mensajeError   = '';
    }
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

  buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    if (
      this.srvice.prodInitialized &&
      this.srvice.prodTerminoCache  === buscarProd &&
      this.srvice.prodPaginaCache   === paginaPrimera
    ) return;

    this.activeSearch = buscarProd;

    this.srvice.getDataNombreCodigoBarra(paginaPrimera, 10, buscarProd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (this.activeSearch !== buscarProd) return;
          this.sinResultados = false;
          this.mensajeError  = '';
          this.paginacion = res;
          this.rows = this.paginacion.t;
          this.totalPaginas = res.totalPaginas ?? 0;
          this.srvice.setProdCache(this.rows, paginaPrimera, this.totalPaginas, buscarProd);
        },
        error: (err) => {
          if (this.activeSearch !== buscarProd) return;
          const esSinResultados = err.status === 404 || err.status === 400;
          if (esSinResultados) {
            this.rows = [];
            this.totalPaginas = 0;
            this.sinResultados = true;
            this.mensajeError  = err.error?.message ?? 'No se encontraron productos';
            this.srvice.setProdCache([], paginaPrimera, 0, buscarProd);
          } else {
            console.error('Error en la petición:', err);
          }
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
  private activeSearch = '';
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


