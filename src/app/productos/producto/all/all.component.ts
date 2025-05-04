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

  // 📌 Obtener el elemento de la celda seleccionada
  const cellElement = event.event.target as HTMLElement;
  const gridElement = document.querySelector('ag-grid-angular') as HTMLElement;

  // ✅ Calcula coordenadas basadas en la celda dentro del grid
  const x = cellElement.offsetLeft + gridElement.offsetLeft + 'px';
  const y = cellElement.offsetTop + gridElement.offsetTop + 'px';

  const button = document.getElementById('menuTrigger') as HTMLElement;
  if (button) {
    button.style.position = 'absolute';
    button.style.left = x;
    button.style.top = y;
  }



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
