import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { CellContextMenuEvent } from 'ag-grid-community';
import { ProductoService } from '../../service/producto.service';
import { IProducto, IProductoDTO, IProductoPaginable } from '../models';
import { AgGridAngular } from 'ag-grid-angular';
@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss']
})
export class AllComponent implements OnInit, AfterViewInit, OnChanges  {
  
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  @Input() buscar?: string;
  @Input() paginacion?: IProductoPaginable<IProductoDTO[]>;
  @Input() itemAgregar?: string;
  @Input() itemEliminar?: string;
  @Input() styleTableWidth?: string = '100%';
  @Input() styleTableheight?: string = '400px';
  gridApi: any;

  paginaPrimera: number = 1;
  paginaUltima: number = 0;




  rows: IProductoDTO[] =  [];
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

  constructor(
    private readonly srvice: ProductoService
  ) { 
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('cambios ')
    if (changes['paginacion'] && this.paginacion?.t) {
      this.rows = [...this.paginacion.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
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
  

  detalle: any[] =[];
  agregarFila() {
    
    
    
    
    const {nombre,descripcion, stock, precioVenta, codigoBarras} = this.filaSeleccionada;
    let cant = 1;
    const prod = {
      nombre,
      descripcion,
      stock,
      precioVenta,
      codigoBarras,
      cantidad: cant
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

  console.log(this.detalle, 'detalle actualizado');

  }

  eliminarFila() {
    this.rows = this.rows.filter(row => row !== this.filaSeleccionada);
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
    this.getData(1);
    document.addEventListener('click', (event: Event) => {
      if (this.menuTrigger.menuOpen) {
        this.menuTrigger.closeMenu();
      }
    });
    
  }

  getData(pagina: number){
    this.srvice.getData(pagina,10).subscribe({
      next: (res) => {
        this.paginacion = res;
        this.rows = this.paginacion.t;
        console.log("---------------------------------------------------")
        console.log(this.paginacion)
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }

  primeraPagina(): void{
    this.paginaPrimera = 1;


    this.conOSinBuscar(this.paginaPrimera);
    console.error('EprimeraPagina:', this.paginaPrimera);
  }
  paginaAnterior(): void{
    this.paginaPrimera = this.paginaPrimera -1;
    this.conOSinBuscar(this.paginaPrimera );

  }
  siguientePagina(): void{
    this.paginaPrimera = this.paginaPrimera +1;
    this.conOSinBuscar(this.paginaPrimera );

  }
  ultimaPagina(): void{
    this.paginaUltima = this.paginacion?.totalPaginas || 0;
    this.paginaPrimera = this.paginacion?.totalPaginas || 0;
    this.conOSinBuscar(this.paginaUltima);
    console.error('ultimaPagina:', this.paginaUltima);
  }


    conOSinBuscar(pagina: number): void{
      if( this.buscarProd == '' ){
        this.getData(pagina);
      }else{
        this.buscarProductoSinKey(pagina,this.buscarProd,);
      }
    }
    buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;
    if(this.buscarProd == ''){
      this.paginaPrimera = 1;
    }
    this.buscarProductoSinKey(this.paginaPrimera,this.buscarProd);
  }

  buscarProductoSinKey(paginaPrimera: number,buscarProd: string): void{
    this.srvice.getDataNombreCodigoBarra(paginaPrimera,10,buscarProd)
    .subscribe({
        next: (res) => {
        this.paginacion = res;
        this.rows = this.paginacion.t;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }

    buscarProductoScroll(paginaPrimera: number): void{
    this.srvice.getDataNombreCodigoBarra(paginaPrimera,10,"")
    .subscribe({
        next: (res) => {
        this.paginacion = res;
            this.rows = [...this.rows, ...this.paginacion.t]; // Agrega sin borrar los anteriores
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }

  onScroll(event: any): void {
    console.log(event)
  const element = event.target;
  if (element.scrollHeight - element.scrollTop === element.clientHeight) {
    this.loadMore(); // Carga más datos
  }
}

trackById(index: number, item: any): number {
  return item.id;
}
loadMore(): void {
  this.buscarProductoScroll(this.paginaPrimera+1);
  // Aquí agregas más elementos a `rows`
  // Por ejemplo, llamando a un servicio o paginando
    console.log("dandole")
}

/**\
 * loadMore(): void {
  console.log('Scroll detectado, cargando más...');
  this.servicio.getMasDatos().subscribe((nuevosItems) => {
    this.rows = [...this.rows, ...nuevosItems];
  });
}
 */

      buscarProd:string = '';
}
