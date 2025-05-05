import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-add-venta',
  templateUrl: './add-venta.component.html',
  styleUrls: ['./add-venta.component.scss']
})
export class AddVentaComponent implements OnInit {
    @Input() styleTableWidth1?: string = '100%';
    @Input() styleTableheight1?: string = '400px';
  constructor() { }

  ngOnInit(): void {
  }

}
