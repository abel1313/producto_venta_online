import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AgGridAngular } from 'ag-grid-angular';
import { IProductoPaginable } from 'src/app/productos/producto/models';
import { IGastos } from '../models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { CellContextMenuEvent } from 'ag-grid-community';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss']
})
export class AllComponent implements OnInit {
    @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
    @ViewChild('agGrid') agGrid!: AgGridAngular;
    @Input() buscar?: string;
    @Input() paginacion?: IProductoPaginable<IGastos[]>;
    @Input() itemAgregar?: string;
    @Input() itemEliminar?: string;
    @Input() styleTableWidth?: string = '100%';
    @Input() styleTableheight?: string = '400px';


  

    gridApi: any;
  
    paginaPrimera: number = 1;
    paginaUltima: number = 0;
  
    totalGastos: number = 0;
  
  
  
    rows: IGastos[] =  [];
    data: IGastos[] = [];
  
    columns = [
      { field: 'id', headerName: 'ID', width: 250 },  
      { field: 'descripcionGasto', headerName: 'Descripcion gasto', width: 600 },  
      { field: 'precioGasto', headerName: 'Precio gasto', width: 400 }
    ];
  
    constructor(
      private readonly srvice: ProductoService
    ) { 
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
        //console.error('menuTrigger no está inicializado');
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
/**
 *       document.addEventListener('click', (event: Event) => {
        if (this.menuTrigger.menuOpen) {
          this.menuTrigger.closeMenu();
        }
      });
 * 
 */
      
    }
  
    getData(pagina: number){
      this.srvice.getDataGastos(pagina,10).subscribe({
        next: (res) => {
          this.paginacion = res;
          this.rows = this.paginacion.t;
          this.totalGastos = this.rows.reduce((sum, item) => sum + item.precioGasto, 0);

        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error al cargar gastos', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de gastos.' });
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

        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error al buscar', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo buscar el gasto.' });
        }
      });
    }

        buscarProd:string = '';
  }
  