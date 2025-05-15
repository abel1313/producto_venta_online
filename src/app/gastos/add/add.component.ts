import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IGastos } from '../models';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {
  @Input() nombreCard: string = '';
  formGastos: FormGroup;

  gastoSave: IGastos;

  constructor(
    private readonly fb: FormBuilder

  ) {

    if(this.nombreCard == ''){
      this.nombreCard = 'Agrgar Producto';
    }

    this.gastoSave = {
      precioGasto:0,
      descripcionGasto: '',
      id:0
    }


    this.formGastos = this.fb.group({
      precioGasto: ['10', [Validators.required, Validators.maxLength(10)]], 
      descripcionGasto: ['asdsd', Validators.required]
    });

    

   }
  ngOnInit(): void {

  }

    gastos():void{
      if( this.formGastos.valid){
        const { codigoBarra, ...productoData } = this.formGastos.value;
  
        const producto: IGastos = this.formGastos.value;

    }
  }

    guardar():void{
  
    }
    update():void{
      
    }
}
