import { IProducto } from './../models/producto.model';
import { AfterViewInit, Component, ElementRef, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from '../../service/producto.service';
import Swal from 'sweetalert2';
import { ArcElement, Chart, PieController } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ArcElement, PieController, ChartDataLabels);

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit, AfterViewInit {

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
      nombre: ['sdasd', [Validators.required, Validators.maxLength(100)]],
      precioCosto: ['10', Validators.required],
      piezas: ['1', Validators.required],
      color: ['asdas'],
      precioVenta: ['1', Validators.required],
      precioRebaja: ['1', Validators.required],
      descripcion: ['asdas', Validators.required],
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
      const { codigoBarras, ...productoData } = this.formProductos.value;

      
      const producto: IProducto = {
        ...productoData, // Asignamos el resto de los valores
        codigoBarras: { codigoBarra: codigoBarras } // ✅ Transformamos el código de barras en `ICodigoBarra`
      };
      
      producto.codigoBarras.id = 0;
      if (!producto.codigoBarras) {
        producto.codigoBarras = { codigoBarras: '', id: 6 }; // ✅ Si no está definido, lo inicializamos
      }
      console.log(producto.descripcion, " antes de ")

      const codBarr = producto.codigoBarras.codigoBarras;
      
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


  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef;
  participantes = ['Juan', 'Ana', 'Carlos', 'Luis', 'Maria'];
  chart!: Chart;

  ngAfterViewInit() {
    Chart.register(ArcElement, PieController);
    Chart.register(ChartDataLabels);

    Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
    setTimeout(() => {
      this.generarRuleta();
    }, 100);


  }
  generarRuleta() {
    if (this.chart) {
      this.chart.destroy(); // Eliminamos instancia previa para evitar errores
    }

    this.chart = new Chart(this.ruletaCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.participantes, // Ahora mostrará los nombres correctamente
        datasets: [{
          data: Array(this.participantes.length).fill(1),
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          datalabels: {
            color: 'white',
            anchor: 'center',
            align: 'center',
            formatter: (_, context) => {
              return context.chart?.data?.labels?.[context.dataIndex] ?? ''; // Safe check to prevent 'undefined' errors
            },
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

iniciarRifa() {
  const ganadorIndex = Math.floor(Math.random() * this.participantes.length);

  // Calculamos el ángulo exacto del ganador
  const anguloPorSegmento = 360 / this.participantes.length;
  const anguloFinal = 360 - (ganadorIndex * anguloPorSegmento + anguloPorSegmento / 2); // Ajuste para alinearse con el gráfico

  // Aplicamos la animación de giro
  this.ruletaCanvas.nativeElement.style.transition = 'transform 3s ease-out';
  this.ruletaCanvas.nativeElement.style.transform = `rotate(${360 * 5 + anguloFinal}deg)`; // Gira varias veces y se detiene en el ganador

  setTimeout(() => {
    alert("¡Ganador: " + this.participantes[ganadorIndex] + "!");
  }, 3000);
}

}
