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
    console.log('desde el hijop', this.paginacion)
  }

  ngOnChanges(changes: SimpleChanges) {
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
      
      console.log(event)

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




  console.log(`Menú en posición: X=${x}, Y=${y}`);

    }

    
  
    
    this.filaSeleccionada = event.data; // ✅ Obtiene la fila seleccionada
    
    //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual

    if (this.menuTrigger) { // ✅ Verifica que `menuTrigger` no es undefined
      
      this.menuTrigger.openMenu();

    } else {
      console.error('menuTrigger no está inicializado');
    }

    

  }
  

  agregarFila() {
    
    console.log(this.filaSeleccionada ,'das')
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
    
    console.log(this.rows, 'buscando ')
  }

  getData(pagina: number){
    this.srvice.getData(pagina,10).subscribe({
      next: (res) => {
        console.log('Datos obtenidos:', res);
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

  primeraPagina(): void{
    this.paginaPrimera = 1;


    this.getData(this.paginaPrimera);
    console.error('EprimeraPagina:', this.paginaPrimera);
  }
  paginaAnterior(): void{
    this.paginaPrimera = this.paginaPrimera -1;
    this.getData(this.paginaPrimera );

  }
  siguientePagina(): void{
    this.paginaPrimera = this.paginaPrimera +1;
    this.getData(this.paginaPrimera );

  }
  ultimaPagina(): void{
    this.paginaUltima = this.paginacion?.totalPaginas || 0;
    this.paginaPrimera = this.paginacion?.totalPaginas || 0;
    this.getData(this.paginaUltima);
    console.error('ultimaPagina:', this.paginaUltima);
  }
}
