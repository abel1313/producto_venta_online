import { IProducto } from './../models/producto.model';
import { Component, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from '../../service/producto.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {

  @Input() nombreCard: string = '';

  formProductos: FormGroup;

  productoSave: IProducto;
habilita = false;
  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ProductoService

  ) {

    if (this.nombreCard == '') {
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
        codigoBarras: '',
        id: 0
      }
    }

    

    this.formProductos = this.fb.group({
      nombre: ['sdasd', [Validators.required, Validators.maxLength(10)]],
      precioCosto: ['asdsd', Validators.required],
      piezas: ['asdas', Validators.required],
      color: ['asdas'],
      precioVenta: ['1001', Validators.required],
      precioRebaja: ['101', Validators.required],
      descipcion: ['asdas', Validators.required],
      stock: ['10000', Validators.required],
      marca: ['asdas', Validators.required],
      contenidoNeto: ['asdas', Validators.required],
      codigoBarras: ['asdas', Validators.required],
      sinCodigoBarra: [false],
    });

    // Escuchar cambios en el checkbox para modificar validación
    this.formProductos.get('sinCodigoBarra')?.valueChanges.subscribe((sinCodigo) => {
      const codigoControl = this.formProductos.get('codigoBarras');

      console.log("existen cambios ", sinCodigo)
      this.formProductos.get('codigoBarras')?.setValue('');
      if (sinCodigo) {
        this.habilita = false;
        codigoControl?.clearValidators(); // ✅ Quita la validación de requerido
      } else {
        codigoControl?.setValidators(Validators.required); // ✅ Reactiva la validación de requerido
        this.habilita = true;
      }

      codigoControl?.updateValueAndValidity(); // ✅ Actualiza la validación en tiempo real
    });


  }

  ngOnInit(): void {
  }


  producto(): void {
    if (this.formProductos.valid) {
      console.log(this.formProductos.value, " -------------------- ")
      const { codigoBarras, ...productoData } = this.formProductos.value;

      console.log( codigoBarras," antes de ")
      
      const producto: IProducto = {
        ...productoData, // Asignamos el resto de los valores
        codigoBarras: { codigoBarra: codigoBarras } // ✅ Transformamos el código de barras en `ICodigoBarra`
      };

      producto.codigoBarras.id = 0;
      if (!producto.codigoBarras) {
        producto.codigoBarras = { codigoBarras: '', id: 6 }; // ✅ Si no está definido, lo inicializamos
      }
      
      const codBarr = producto.codigoBarras.codigoBarras;
      console.log("producto 123 ", codBarr)
                this.productoSave = {
            nombre: producto.nombre,
            precioCosto: producto.precioCosto,
            piezas: producto.piezas,
            color: producto.color,
            precioVenta: producto.precioRebaja,
            precioRebaja: producto.precioRebaja,
            descripcion: producto.descripcion || "",
            stock: producto.stock,
            marca: producto.marca,
            contenido: producto.contenido || '',
            codigoBarras: {
              codigoBarras: codigoBarras,
              id: producto.codigoBarras.id
            }
          }

      console.log(JSON.stringify(this.productoSave), " produvcto ")
    }

    this.guardar();
  }

  guardar(): void {
    this.service.saveProducto(this.productoSave)
      .subscribe({
        next: (save) => {
          Swal.fire({
            title: "Se guardo Correctamente",
            icon: "success",
            draggable: true
          });

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
              codigoBarras: '',
              id: 0
            }
          }
        },
        error(error) {
          console.log(error);
        }
      });
  }
  update(): void {

  }



}
