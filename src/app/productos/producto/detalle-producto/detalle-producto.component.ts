import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-detalle-producto',
  templateUrl: './detalle-producto.component.html',
  styleUrls: ['./detalle-producto.component.scss']
})
export class DetalleProductoComponent implements OnInit {
idProducto!: number;
  constructor(
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit(): void {
      this.idProducto = +this.route.snapshot.paramMap.get('id')!;
      console.log(this.idProducto)
  }

}
