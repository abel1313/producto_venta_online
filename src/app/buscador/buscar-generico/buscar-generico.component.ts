import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-buscar-generico',
  templateUrl: './buscar-generico.component.html',
  styleUrls: ['./buscar-generico.component.scss']
})
export class BuscarGenericoComponent implements OnInit {

    buscarProd:string = '';
    @Output() $textBuscar = new EventEmitter<any>();
    
  constructor() { }

  ngOnInit(): void {
  }

  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;
    this.$textBuscar.emit(this.buscarProd);
    
  }
}
