import { IProducto } from './../models/producto.model';
import { Component, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {

  @Input() nombreCard: string = '';

  formProductos: FormGroup;

  productoSave: IProducto;

  constructor(
    private readonly fb: FormBuilder

  ) {

    if(this.nombreCard == ''){
      this.nombreCard = 'Agrgar Producto';
    }

    this.productoSave = {
    nombre: '',
    precioCosto: 0,
    piezas: 0,
    color: '',
    precioVenta: 0,
    precioRebaja: 0,
    descripcion: '',
    stock: 0,
    marca: '',
    contenido: '',
    codigoBarras: {
      codigoBarra:'',
      id: 0
    }
    }


    this.formProductos = this.fb.group({
      nombre: ['sdasd', [Validators.required, Validators.maxLength(10)]], 
      precioCosto: ['asdsd', Validators.required], 
      piezas: ['asdas', Validators.required], 
      color: ['asdas'], 
      precioVenta: ['asdas', Validators.required], 
      precioRebaja: ['asdas', Validators.required], 
      descipcion: ['asdas', Validators.required], 
      stock: ['asdas', Validators.required],
      marca: ['asdas', Validators.required], 
      contenidoNeto: ['asdas', Validators.required], 
      codigoBarra: ['asdas', Validators.required], 
      sinCodigoBarra: [false], 
    });

        // Escuchar cambios en el checkbox para modificar validación
        this.formProductos.get('sinCodigoBarra')?.valueChanges.subscribe((sinCodigo) => {
          const codigoControl = this.formProductos.get('codigoBarra');
    
          if (sinCodigo) {
            this.formProductos.get('codigoBarra')?.setValue('');
            codigoControl?.clearValidators(); // ✅ Quita la validación de requerido
          } else {
            codigoControl?.setValidators(Validators.required); // ✅ Reactiva la validación de requerido
          }
    
          codigoControl?.updateValueAndValidity(); // ✅ Actualiza la validación en tiempo real
        });
    

   }

  ngOnInit(): void {
  }


  producto():void{
    if( this.formProductos.valid){
      const { codigoBarra, ...productoData } = this.formProductos.value;

      const producto: IProducto = {
        ...productoData, // Asignamos el resto de los valores
        codigoBarras: { codigoBarra: codigoBarra } // ✅ Transformamos el código de barras en `ICodigoBarra`
      };

      if (!producto.codigoBarras) {
        producto.codigoBarras = { codigoBarra: '', id: 6 }; // ✅ Si no está definido, lo inicializamos
      } else {
        producto.codigoBarras.id = 6; // ✅ Si ya está definido, solo asignamos `id`
      }
  
      this.productoSave = producto;

      console.log(this.productoSave);
      console.log(this.productoSave.codigoBarras.id);
    }
  }

  guardar():void{

  }
  update():void{
    
  }

}
