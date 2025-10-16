import { ChangeDetectorRef, Component, NgZone, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent } from 'ag-grid-community';
import { ProductoService } from 'src/app/productos/service/producto.service';

@Component({
  selector: 'app-buscar-venta',
  templateUrl: './buscar-venta.component.html',
  styleUrls: ['./buscar-venta.component.scss']
})
export class BuscarVentaComponent implements OnInit {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @ViewChild('agGrid') agGrid!: AgGridAngular;

  paginacion?: any;
  itemAgregar?: string;
  itemEliminar?: string;
  styleTableWidth?: string = '100%';
  styleTableheight?: string = '400px';
  columnas?: any;
  gridApi: any;


  paginaPrimera: number = 1;
  paginaUltima: number = 0;


  detalle: any[] = [];

  totalVenta: number = 0;


  rows: any =  [];
  data: any = [];
  constructor(
    private readonly service: ProductoService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }


  columnsDetalle: any = [
    { field: 'id', headerName: 'ID Detalle' },
    { field: 'nombreUsuario', headerName: 'Nombre Usuario' },
    { field: 'nombreProducto', headerName: 'Nombre Producto', width: 250 },
    { field: 'cant', headerName: 'cantidad' },
    { field: 'precioUnitario', headerName: 'Precio por pieza' },
    { field: 'subTotal', headerName: 'Sub Total' },
    { field: 'total', headerName: 'Total', width: 200 }
  ];


  ngOnInit(): void {

    /**
     *         document.addEventListener('click', (event: Event) => {
      if (this.menuTrigger.menuOpen) {
        this.menuTrigger.closeMenu();
      }
    });
     */
    
  }

  
  agregarFila() {
    



  }

  eliminarFila() {
    
  }

  obtenerTextoBuscar(dato: string){
    console.log('data ', dato )
  }

  primeraPagina(data: any):void{

  }
sigPagina(data: any):void{

}
antPagina(data: any):void{

}
ultPagina(data: any):void{

}



buscarTotalDetalle(): void{
  this.service.getTotalVenta().subscribe({
    next:(res)=>{
      this.rows = res; // ✅ Crear nueva referencia
    this.totalVenta = this.rows.reduce((sum: any, item: any) => sum + item.subTotal, 0);
    },
    error(err){
      console.error(err)
    }
  }
  );
}


  ngOnChanges(changes: SimpleChanges) {
    
    console.log("desde el padre en cada cabui 123 ",changes['paginacion'].currentValue )
    
    if (changes['paginacion'] && this.paginacion?.t) {
       console.log("dcambio " )
      this.rows = [...this.paginacion.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
      this.cdr.detectChanges(); // ✅ Forzar actualización de la vista
    }
      if (changes['paginacion'] && this.paginacion?.rows  ) {
      this.rows = [...this.paginacion.rows]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
       
      this.cdr.detectChanges(); // ✅ Forzar actualización de la vista

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

    } 
    

  }



}
