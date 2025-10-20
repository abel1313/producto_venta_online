import { Component, OnInit } from '@angular/core';
import { IProductoDTO } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTORec } from '../models/producto.dto.model';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss']
})
export class UpdateComponent implements OnInit {

  productoActualizar: IProductoDTORec | null = null;
  constructor(
    private readonly serviceProducto: ProductoService
  ) { }

  ngOnInit(): void {
    this.serviceProducto.productoUpdate$.subscribe(producto=>{
    this.productoActualizar = producto;
    });
  }

}
