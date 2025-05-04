import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { CellContextMenuEvent } from 'ag-grid-community';

@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss']
})
export class AllComponent implements OnInit, AfterViewInit  {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  rows = [
    { name: 'Austin', gender: 'Male', company: 'Swimlane' },
    { name: 'Dany', gender: 'Male', company: 'KFC' },
    { name: 'Molly', gender: 'Female', company: 'Burger King' }
  ];
  columns = [
    { field: 'name', headerName: 'Nombre' },  
    { field: 'gender', headerName: 'Género' },  
    { field: 'company', headerName: 'Empresa' }
  ];

  constructor() { }

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
    this.rows.push({ name: 'Nuevo Producto', gender: 'N/A', company: 'Nuevo' });
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



  }

}
