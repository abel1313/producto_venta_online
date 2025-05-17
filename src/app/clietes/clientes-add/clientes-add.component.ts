import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { ICliente } from '../models';
import { Constants } from 'src/app/Constants';

@Component({
  selector: 'app-clientes-add',
  templateUrl: './clientes-add.component.html',
  styleUrls: ['./clientes-add.component.scss']
})
export class ClientesAddComponent implements OnInit {

@Input() nombreCard: string = '';

@Output() $hideComponent = new EventEmitter<boolean>();
  formCliente: FormGroup;

  clienteSave: ICliente;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ProductoService

  ) {

    if(this.nombreCard == ''){
      this.nombreCard = 'Agrgar Producto';
    }

    this.clienteSave = {
      nombrePersona: '',
      segundoNombre: '',
      apeidoPaterno: '',
      apeidoMaterno: '',
      sexo: '',
      correoElectronico: '',
      numeroTelefonico: ''
        }


    this.formCliente = this.fb.group({
      nombrePersona: ['Raul', [Validators.required]], 
      segundoNombre: [''],
      apeidoPaterno: ['Rogel', Validators.required],
      apeidoMaterno: ['Tejada', Validators.required],
      sexo: ['Hombre'],
      correoElectronico: [''],
      numeroTelefonico: ['']
    });

    

   }
  ngOnInit(): void {

  }

    gastos():void{
      if( this.formCliente.valid){
        const { codigoBarra, ...productoData } = this.formCliente.value;
  
        const producto: ICliente = this.formCliente.value;

    }
  }

    guardar():void{
      this.clienteSave = this.formCliente.value;
      this.service.saveCliente(this.clienteSave)
      .subscribe({
        next:(res)=>{
          this.formCliente.reset();
            Swal.fire({
              title: "Se guardo Correctamente",
              icon: "success",
              draggable: true
            });

            sessionStorage.setItem(Constants.DATA_CLIENTE,JSON.stringify(res.data));

            this.$hideComponent.emit(true);
        },
        error(error){
          console.log(error)
        }
      });
      
      
    }
    update():void{
      
    }

}
