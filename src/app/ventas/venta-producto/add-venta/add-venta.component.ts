import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent } from 'ag-grid-community';
import { IProductoDTO, IProductoPaginable } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';

@Component({
  selector: 'app-add-venta',
  templateUrl: './add-venta.component.html',
  styleUrls: ['./add-venta.component.scss']
})
export class AddVentaComponent implements OnInit {
    @ViewChild(MatMenuTrigger) menuTriggerBuscador!: MatMenuTrigger;
    @ViewChild('agGrid') agGrid!: AgGridAngular;
    rowsBuscador: any [] =[];
    buscarProd:string = '';
    paginacionBuscador?: IProductoPaginable<IProductoDTO[]>;
    styleTableWidthBuscador: string = '100%';
    styleTableheightBusador: string = '200px';

    paginaPrimeraBuscador: number = 1;
    paginaUltimaBuscador: number = 0;



    @ViewChild(MatMenuTrigger) menuTriggerDetalle!: MatMenuTrigger;
    rowsDetalle: any [] =[];
    paginacionDetalle?: IProductoPaginable<IProductoDTO[]>;
    styleTableWidthDetalle: string = '100%';
    styleTableheightDetalle: string = '200px';

    paginaPrimeraDetalle: number = 1;
    paginaUltimaDetalle: number = 0;



  constructor(
    private readonly service: ProductoService
  ) { }

    columnsBuscador = [
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
      { field: 'codigoBarras', headerName: 'Codigo Barras' }
    ];


    columnsDetalle = [
      { field: 'nombre', headerName: 'Nombre' },  
      { field: 'descripcion', headerName: 'Descripcion' },  
      { field: 'stock', headerName: 'Stock' },
      { field: 'precioVenta', headerName: 'Precio Venta' },
      { field: 'codigoBarras', headerName: 'Codigo Barras' },
      { field: 'cantidad', headerName: 'Cantidad' },
      { field: 'total', headerName: 'subTotal' }

    ];
  ngOnInit(): void {
    this.getDataBuscador(1)
  }
  ngOnChangesBuscador(changes: SimpleChanges) {
    if (changes['paginacion'] && this.paginacionBuscador?.t) {
      this.rowsBuscador = [...this.paginacionBuscador.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
  }
  
  
  
  detalle: any[] =[];
  totalDetalle: number = 0;
  agregarFilaBuscador() {
    
    
    
    
    const {nombre,descripcion, stock, precioVenta, codigoBarras} = this.filaSeleccionadaBuscador;
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

  this.rowsDetalle = [...this.detalle];

  this.totalDetalle = this.rowsDetalle.reduce((sum, item) => sum + item.total, 0);



  }

  eliminarFilaBuscador() {
    this.rowsBuscador = this.rowsBuscador.filter(row => row !== this.filaSeleccionadaBuscador);
  }


  getDataBuscador(paginaBuscador: number){
    this.service.getData(paginaBuscador,10).subscribe({
      next: (res) => {
        this.paginacionBuscador = res;
        this.rowsBuscador = this.paginacionBuscador.t;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }

  filaSeleccionadaBuscador: any;
  blockContextMenuBuscador(event: MouseEvent) {
    event.preventDefault(); // ✅ Bloquea el menú del navegador
    event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
  }
    abrirMenuBuscador(event: CellContextMenuEvent<any>) {
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
      this.menuTriggerBuscador.openMenu();
    }, 0);
  
  
  
      }
  
      
    
      
      this.filaSeleccionadaBuscador = event.data; // ✅ Obtiene la fila seleccionada
      
      //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
  
      if (this.menuTriggerBuscador) { // ✅ Verifica que `menuTrigger` no es undefined
        
        this.menuTriggerBuscador.openMenu();
  
      } 
  
      
  
    }

  primeraPaginaBuscador(): void{
    this.paginaPrimeraBuscador = 1;


    this.getDataBuscador(this.paginaPrimeraBuscador);
  }
  paginaAnteriorBuscador(): void{
    this.paginaPrimeraBuscador = this.paginaPrimeraBuscador -1;
    this.getDataBuscador(this.paginaPrimeraBuscador );

  }
  siguientePaginaBuscador(): void{
    this.paginaPrimeraBuscador = this.paginaPrimeraBuscador +1;
    this.getDataBuscador(this.paginaPrimeraBuscador );

  }
  ultimaPaginaBuscador(): void{
    this.paginaUltimaBuscador = this.paginacionBuscador?.totalPaginas || 0;
    this.paginaPrimeraBuscador = this.paginacionBuscador?.totalPaginas || 0;
    this.getDataBuscador(this.paginaUltimaBuscador);
  }


  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;

    this.buscarPorNombreCodigoPostal(1,10,this.buscarProd);
    
  }

  
  buscarPorNombreCodigoPostal(pagina:number,size:number,nombre:string): void{
    
    this.service.getDataNombreCodigoBarra(pagina,size,nombre).subscribe({
      next: (res) => {
        this.paginacionBuscador = res;
        this.rowsBuscador = this.paginacionBuscador.t
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }


















































  ngOnChangesDetalle(changes: SimpleChanges) {
    if (changes['paginacion'] && this.paginacionDetalle?.t) {
      this.rowsDetalle = [...this.paginacionDetalle.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
  }
  
  
  


  eliminarFilaDetalle() {
    this.rowsDetalle = this.rowsDetalle.filter(row => row !== this.filaSeleccionadaDetalle);
  }


  getDataDetalle(paginaDetalle: number){
    this.service.getData(paginaDetalle,10).subscribe({
      next: (res) => {
        this.paginacionDetalle = res;
        this.rowsDetalle = this.paginacionDetalle.t;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      },
      complete: () => {
        console.log('Petición completada');
      }
    });
  }

  filaSeleccionadaDetalle: any;
  blockContextMenuDetalle(event: MouseEvent) {
    event.preventDefault(); // ✅ Bloquea el menú del navegador
    event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
  }
    abrirMenuDetalle(event: CellContextMenuEvent<any>) {
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
      this.menuTriggerDetalle.openMenu();
    }, 0);
  
  
  
      }
  
      
    
      
      this.filaSeleccionadaDetalle = event.data; // ✅ Obtiene la fila seleccionada
      
      //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
  
      if (this.menuTriggerDetalle) { // ✅ Verifica que `menuTrigger` no es undefined
        
        this.menuTriggerDetalle.openMenu();
  
      } 
  
      
  
    }

  primeraPaginaDetalle(): void{
    this.paginaPrimeraDetalle = 1;


    this.getDataDetalle(this.paginaPrimeraDetalle);
  }
  paginaAnteriorDetalle(): void{
    this.paginaPrimeraDetalle = this.paginaPrimeraDetalle -1;
    this.getDataDetalle(this.paginaPrimeraDetalle );

  }
  siguientePaginaDetalle(): void{
    this.paginaPrimeraDetalle = this.paginaPrimeraDetalle +1;
    this.getDataDetalle(this.paginaPrimeraDetalle );

  }
  ultimaPaginaDetalle(): void{
    this.paginaUltimaDetalle = this.paginacionDetalle?.totalPaginas || 0;
    this.paginaPrimeraDetalle = this.paginacionDetalle?.totalPaginas || 0;
    this.getDataDetalle(this.paginaUltimaDetalle);
  }




  


}
