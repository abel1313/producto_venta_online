import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AgGridAngular } from 'ag-grid-angular';
import { CellContextMenuEvent } from 'ag-grid-community';
import { IProductoDTO, IProductoPaginable } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { IUsuario, IVenta } from '../models';
import { IDetalleVenta } from '../models/detalleVenta.mode';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-venta',
  templateUrl: './add-venta.component.html',
  styleUrls: ['./add-venta.component.scss']
})
export class AddVentaComponent implements OnInit {
  @ViewChild(MatMenuTrigger) menuTriggerBuscador!: MatMenuTrigger;
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  rowsBuscador: any[] = [];
  buscarProd: string = '';
  paginacionBuscador?: IProductoPaginable<IProductoDTO[]>;
  styleTableWidthBuscador: string = '100%';
  styleTableheightBusador: string = '200px';

  paginaPrimeraBuscador: number = 1;
  paginaUltimaBuscador: number = 0;



  @ViewChild(MatMenuTrigger) menuTriggerDetalle!: MatMenuTrigger;
  rowsDetalle: any[] = [];
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
    { field: 'codigoBarras', headerName: 'Codigo Barras' },
    { field: 'precioVenta', headerName: 'Precio Venta' },
    { field: 'stock', headerName: 'Stock' },
    { field: 'piezas', headerName: 'Piezas' },
    { field: 'color', headerName: 'Color' },
    { field: 'precioCosto', headerName: 'Precio Costo' },
    { field: 'precioRebaja', headerName: 'Precio Rebaja' },
    { field: 'descripcion', headerName: 'Descripcion' },
    { field: 'marca', headerName: 'Marca' },
    { field: 'contenido', headerName: 'Contenido' }
  ];


  columnsDetalle = [
    { field: 'nombre', headerName: 'Nombre' },
    { field: 'descripcion', headerName: 'Descripcion' },
    { field: 'stock', headerName: 'Stock' },
    { field: 'precioVenta', headerName: 'Precio Venta' },
    { field: 'codigoBarras', headerName: 'Codigo Barras' },
    { field: 'cantidad', headerName: 'Cantidad' },
    { field: 'subTotal', headerName: 'Sub total' }

  ];
  ngOnInit(): void {
    this.getDataBuscador(1)
  }
  ngOnChangesBuscador(changes: SimpleChanges) {
    if (changes['paginacion'] && this.paginacionBuscador?.t) {
      this.rowsBuscador = [...this.paginacionBuscador.t]; // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
  }



  detalle: any[] = [];
  totalDetalle: string = 'Total ';

  usuario: IUsuario = {
    nombre: '',
  };
  venta: IVenta = {
    usuario: this.usuario,
    totalVenta: 0,

  }


  detalleVenta: IDetalleVenta[] = [];

  agregarFilaBuscador() {

    const index = this.filaSeleccionadaBuscadorIndex || 0; // Obtener el índice del producto seleccionado


    if (index >= 0 && index < this.rowsBuscador.length) {
      if (this.rowsBuscador[index].stock > 0) {
        this.rowsBuscador[index].stock -= 1; // Reducir el stock correctamente

        // 🔥 Forzar actualización en Ag-Grid
        this.rowsBuscador = [...this.rowsBuscador]; // Clonar el array para que Angular detecte el cambio

        if( this.rowsBuscador[index].stock == 0 ){
        this.rowsBuscador.splice(index, 1);

        // 🔥 Forzar actualización en Ag-Grid
        this.rowsBuscador = [...this.rowsBuscador]; // Clonar el array para que Angular detecte el cambio
        }
      } else {
        console.warn("No hay stock disponible para este producto.");
  // 🗑️ Eliminar la fila del array


        return;
      }
    } else {
      console.warn("Índice fuera de rango, no se pudo modificar.");
    }

    const { nombre, descripcion, stock, precioVenta, codigoBarras } = this.filaSeleccionadaBuscador;

    let canti = 1;
    const prod: IDetalleVenta = {
      nombre,
      descripcion,
      stock,
      precioVenta,
      codigoBarras,
      cantidad: canti,
      subTotal: 0
    }

    // Buscar si ya existe el producto
    const index2 = this.detalleVenta.findIndex(item => item.codigoBarras === prod.codigoBarras && item.nombre === prod.nombre);

    if (index2 !== -1) {
      // Si existe, incrementar la cantidad y actualizar el total
      this.detalleVenta[index2].cantidad += 1;
    } else {
      // Si no existe, agregarlo a la lista
      this.detalleVenta.push(prod);
    }

    // Calcular el total de cada producto
    this.detalleVenta.forEach(item => item.subTotal = item.cantidad * item.precioVenta);


    this.rowsDetalle = [...this.detalleVenta];

    const total = this.rowsDetalle.reduce((sum, item) => sum + item.subTotal, 0);
    this.totalDetalle = 'Total $ ' + total;

    this.disableBoton = total > 0;
  }

  disableBoton: boolean = false;

  saveDetalle(): void {

    if (this.disableBoton) {
      this.service.saveVenta(this.detalleVenta).subscribe({
        next: (res) => {
          Swal.fire({
            title: "Drag me!",
            icon: "success",
            draggable: true
          });
          this.disableBoton = false;
          this.detalleVenta = [];
          this.totalDetalle = 'Total ';
        },
        error: (err) => {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Something went wrong!"
          });
        }
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Deberia ingresar productos"
      });
    }
  }

  eliminarFilaBuscador() {
    this.rowsBuscador = this.rowsBuscador.filter(row => row !== this.filaSeleccionadaBuscador);
  }


  getDataBuscador(paginaBuscador: number) {
    this.service.getData(paginaBuscador, 10).subscribe({
      next: (res) => {
        this.paginacionBuscador = res;
        this.rowsBuscador = this.paginacionBuscador.t;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      }
    });
  }

  filaSeleccionadaBuscador: any;
  filaSeleccionadaBuscadorIndex: any;
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
    this.filaSeleccionadaBuscadorIndex = event.rowIndex;

    //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual

    if (this.menuTriggerBuscador) { // ✅ Verifica que `menuTrigger` no es undefined

      this.menuTriggerBuscador.openMenu();

    }



  }

  primeraPaginaBuscador(): void {
    this.paginaPrimeraBuscador = 1;


    this.getDataBuscador(this.paginaPrimeraBuscador);
  }
  paginaAnteriorBuscador(): void {
    this.paginaPrimeraBuscador = this.paginaPrimeraBuscador - 1;
    this.getDataBuscador(this.paginaPrimeraBuscador);

  }
  siguientePaginaBuscador(): void {
    this.paginaPrimeraBuscador = this.paginaPrimeraBuscador + 1;
    this.getDataBuscador(this.paginaPrimeraBuscador);

  }
  ultimaPaginaBuscador(): void {
    this.paginaUltimaBuscador = this.paginacionBuscador?.totalPaginas || 0;
    this.paginaPrimeraBuscador = this.paginacionBuscador?.totalPaginas || 0;
    this.getDataBuscador(this.paginaUltimaBuscador);
  }


  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;

    this.buscarPorNombreCodigoPostal(1, 10, this.buscarProd);

  }


  buscarPorNombreCodigoPostal(pagina: number, size: number, nombre: string): void {

    this.service.getDataNombreCodigoBarra(pagina, size, nombre).subscribe({
      next: (res) => {
        this.paginacionBuscador = res;
        this.rowsBuscador = this.paginacionBuscador.t
      },
      error: (err) => {
        console.error('Error en la petición:', err);
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


  getDataDetalle(paginaDetalle: number) {
    this.service.getData(paginaDetalle, 10).subscribe({
      next: (res) => {
        this.paginacionDetalle = res;
        this.rowsDetalle = this.paginacionDetalle.t;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
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

  primeraPaginaDetalle(): void {
    this.paginaPrimeraDetalle = 1;


    this.getDataDetalle(this.paginaPrimeraDetalle);
  }
  paginaAnteriorDetalle(): void {
    this.paginaPrimeraDetalle = this.paginaPrimeraDetalle - 1;
    this.getDataDetalle(this.paginaPrimeraDetalle);

  }
  siguientePaginaDetalle(): void {
    this.paginaPrimeraDetalle = this.paginaPrimeraDetalle + 1;
    this.getDataDetalle(this.paginaPrimeraDetalle);

  }
  ultimaPaginaDetalle(): void {
    this.paginaUltimaDetalle = this.paginacionDetalle?.totalPaginas || 0;
    this.paginaPrimeraDetalle = this.paginacionDetalle?.totalPaginas || 0;
    this.getDataDetalle(this.paginaUltimaDetalle);
  }







}
