import { Component, OnInit } from '@angular/core';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  estado: 'activo' | 'inactivo';
  categoria: string;
}

@Component({
  selector: 'app-demo-tablas',
  templateUrl: './demo-tablas.component.html',
  styleUrls: ['./demo-tablas.component.scss']
})
export class DemoTablasComponent implements OnInit {

  productos: Producto[] = [
    { id: 1, nombre: 'Bolsa Cuero Premium', precio: 89.99, stock: 15, estado: 'activo', categoria: 'Bolsas' },
    { id: 2, nombre: 'Pantalón Jean Clásico', precio: 59.99, stock: 32, estado: 'activo', categoria: 'Pantalones' },
    { id: 3, nombre: 'Falda Midi Flores', precio: 49.99, stock: 8, estado: 'activo', categoria: 'Faldas' },
    { id: 4, nombre: 'Bolsa Tela Lino', precio: 34.99, stock: 0, estado: 'inactivo', categoria: 'Bolsas' },
    { id: 5, nombre: 'Pantalón Jogger', precio: 54.99, stock: 22, estado: 'activo', categoria: 'Pantalones' },
    { id: 6, nombre: 'Falda Denim', precio: 55.99, stock: 12, estado: 'activo', categoria: 'Faldas' },
  ];

  columnasMatTable = ['id', 'nombre', 'categoria', 'precio', 'stock', 'estado'];

  columnasEnc = [
    { field: 'id', header: 'ID' },
    { field: 'nombre', header: 'Producto' },
    { field: 'categoria', header: 'Categoría' },
    { field: 'precio', header: 'Precio' },
    { field: 'stock', header: 'Stock' },
    { field: 'estado', header: 'Estado' },
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
