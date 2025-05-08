import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-buscar-venta',
  templateUrl: './buscar-venta.component.html',
  styleUrls: ['./buscar-venta.component.scss']
})
export class BuscarVentaComponent implements OnInit {

  constructor() { }


  columnsDetalle: any = [
    { field: 'nombre', headerName: 'Nombre Producto' },
    { field: 'cantidad', headerName: 'cantidad' },
    { field: 'precioProducto', headerName: 'Precio Producto' },
    { field: 'subTotal', headerName: 'Sub Total' }
  ];


  paginacion: any = {
    rows : [
      {
        nombre: '1',
        cantidad: '1',
        precioProducto: '1',
        subTotal: '1'
      }
    ]
  };

  ngOnInit(): void {
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

}
