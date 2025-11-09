import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IGastos } from '../models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';

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
    private readonly fb: FormBuilder,
    private readonly service: ProductoService

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
      precioGasto: ['10', [Validators.required, Validators.maxLength(100), Validators.pattern("^[0-9]*$") ]], 
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
      this.gastoSave = this.formGastos.value;
      this.service.saveGasto(this.gastoSave)
      .subscribe({
        next:(res)=>{
          this.formGastos.reset();
            Swal.fire({
              title: "Se guardo Correctamente",
              icon: "success",
              draggable: true
            });
        },
        error(error){
          console.error(error)
        }
      });
      
    }
    update():void{
      
    }
}
