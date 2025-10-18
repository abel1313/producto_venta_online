import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IconService {
  iconCarrito = 'assets/iconos/cart.png';
  iconEliminar = 'assets/iconos/delete.png';
  iconEditar = 'assets/iconos/refresh.png';
  iconSave = 'assets/iconos/diskette.png';
  constructor() { }
}
