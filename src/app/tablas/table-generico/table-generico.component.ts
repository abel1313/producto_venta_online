import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent } from 'ag-grid-community';
import { IProductoDTO, IProductoPaginable } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';

@Component({
  selector: 'app-table-generico',
  templateUrl: './table-generico.component.html',
  styleUrls: ['./table-generico.component.scss']
})
export class TableGenericoComponent implements OnInit, AfterViewInit, OnChanges  {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @ViewChild('agGrid') agGrid!: AgGridAngular;

  @Input() paginacion?: any;
  @Input() itemAgregar?: string;
  @Input() itemEliminar?: string;
  @Input() styleTableWidth?: string = '100%';
  @Input() styleTableheight?: string = '400px';
  @Input() columnas?: any;
  gridApi: any;
  @Output() $primeraPagina = new EventEmitter<any>();
  @Output() $siguientePagina = new EventEmitter<any>();
  @Output() $anteriorPagina = new EventEmitter<any>();
  @Output() $ultimaPagina = new EventEmitter<any>();

  paginaPrimera: number = 1;
  paginaUltima: number = 0;


  detalle: any[] = [];



  rows: any =  [];
  data: any = [];



  constructor(
    private readonly srvice: ProductoService,
    private cdr: ChangeDetectorRef
  ) { 
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
  

  agregarFila() {
    



  }

  eliminarFila() {
    
  }

  ngAfterViewInit() {

    console.log(this.paginacion);
    this.rows = this.paginacion.rows;
    if (!this.menuTrigger) {
      console.error('menuTrigger no está inicializado');
    }

    const button = document.getElementById('menuTrigger');
    if (button) {
      button.setAttribute("style", "background-color: red !important;");
    }
    
  }

  ngOnInit(): void {

    document.addEventListener('click', (event: Event) => {
      if (this.menuTrigger.menuOpen) {
        this.menuTrigger.closeMenu();
      }
    });
    
    console.log(this.rows, 'buscando ')
  }



  primeraPagina(): void{
    this.paginaPrimera = 1;
    this.$primeraPagina.emit(this.paginaPrimera);
  }
  paginaAnterior(): void{
    this.paginaPrimera = this.paginaPrimera -1;
    this.$anteriorPagina.emit(this.paginaPrimera);

  }
  siguientePagina(): void{
    this.paginaPrimera = this.paginaPrimera +1;
    this.$siguientePagina.emit(this.paginaPrimera);

  }
  ultimaPagina(): void{
    this.paginaUltima = this.paginacion?.totalPaginas || 0;
    this.$ultimaPagina.emit(this.paginaUltima);
  }
}
