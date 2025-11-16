import { IProductoDTORec } from './../models/producto.dto.model';
import { IProducto } from './../models/producto.model';
import { AfterViewInit, Component, ElementRef, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from '../../service/producto.service';
import Swal from 'sweetalert2';
import { ArcElement, Chart, PieController } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { IProductoImagen } from '../models/productoImagen.model';
import { IImagenDto } from '../models';
import { AuthService } from 'src/app/auth/auth.service';

Chart.register(ArcElement, PieController, ChartDataLabels);

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;
  private ctx!: CanvasRenderingContext2D;
  private img = new Image();
  private imgX = 0;
  private imgY = 0;
  private dragging = false;
  private offsetX = 0;
  private offsetY = 0;
  @Input() nombreCard: string = '';
  @Input() productoUpdate: IProductoDTORec | null = null;

  formProductos: FormGroup;

  productoSave: IProducto;
  habilita = false;
  productoImagen: IProductoImagen[] = [];
  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ProductoService,
    public authService: AuthService
  ) {

    if (this.nombreCard == '') {
      this.nombreCard = 'Agregar Producto';
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
      actualizarStock: 0,
      eliminarStock: 0,
      codigoBarras: {
        codigoBarras: '',
        id: 0
      },
      listImagenes: []
    }



    this.formProductos = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      precioCosto: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      piezas: ['', Validators.required],
      color: [''],
      precioVenta: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      precioRebaja: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      descripcion: ['', Validators.required],
      stock: ['', Validators.required],
      marca: ['', Validators.required],
      contenido: ['', Validators.required],
      actualizarStock: ['0'],
      eliminarStock: ['0'],
      codigoBarras: ['', [Validators.required, Validators.maxLength(100)]],
      sinCodigoBarra: [false],
    });

    // Escuchar cambios en el checkbox para modificar validación
    this.formProductos.get('sinCodigoBarra')?.valueChanges.subscribe((sinCodigo) => {
      const codigoControl = this.formProductos.get('codigoBarras');
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
        producto.codigoBarras = { codigoBarras: null, id: 6 }; // ✅ Si no está definido, lo inicializamos
      }

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
        actualizarStock: producto.actualizarStock,
        eliminarStock: producto.eliminarStock,
        codigoBarras: {
          codigoBarras: codigoBarras,
          id: producto.codigoBarras.id
        },
        listImagenes: this.imagenesCargadas
      }

    }

    this.guardar();
  }

  guardar(): void {

    this.service.saveProducto(this.productoSave)
      .subscribe({
        next: (save) => {
          this.formProductos.reset();
          this.imagenesCargadas = [];

          const canvas = this.canvasRef.nativeElement;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            actualizarStock: 0,
            eliminarStock: 0,
            codigoBarras: {
              codigoBarras: '',
              id: 0
            },
            listImagenes: []
          }
        },
        error(error) {
          console.error(error);
        }
      });
  }

  update(): void {
    this.producto();
  }


  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef;
  participantes = ['Juan', 'Ana', 'Carlos', 'Luis', 'Maria'];
  chart!: Chart;

  ngAfterViewInit() {
    if (this.nombreCard === 'Actualizar Producto') {
      this.habilita = false;
      this.formProductos.get('nombre')?.setValue(this.productoUpdate?.nombre);
      this.formProductos.get('precioCosto')?.setValue(this.productoUpdate?.precioVenta);
      this.formProductos.get('piezas')?.setValue(this.productoUpdate?.piezas);
      this.formProductos.get('color')?.setValue(this.productoUpdate?.color);
      this.formProductos.get('precioVenta')?.setValue(this.productoUpdate?.precioVenta);
      this.formProductos.get('precioRebaja')?.setValue(this.productoUpdate?.precioRebaja);
      this.formProductos.get('descripcion')?.setValue(this.productoUpdate?.descripcion);
      this.formProductos.get('stock')?.setValue(this.productoUpdate?.stock);
      this.formProductos.get('marca')?.setValue(this.productoUpdate?.marca);
      this.formProductos.get('contenido')?.setValue(this.productoUpdate?.contenido);

      // Código de barras
      const codigoBarr = this.productoUpdate?.codigoBarras ?? '';
      const codValid = codigoBarr == '';
      this.formProductos.get('sinCodigoBarra')?.setValue(codValid)
      this.formProductos.get('codigoBarras')?.setValue(this.productoUpdate?.codigoBarras);
      this.formProductos.get('sinCodigoBarra')?.valueChanges.subscribe((sinCodigo) => {
        const codigoControl = this.formProductos.get('codigoBarras');
        if (sinCodigo) {
          codigoControl?.disable();
          codigoControl?.clearValidators();
        } else {
          this.formProductos.get('codigoBarras')?.setValue(this.productoUpdate?.codigoBarras);
          codigoControl?.enable();
          codigoControl?.setValidators(Validators.required);
        }

        codigoControl?.updateValueAndValidity();
      });

      // Escuchar cambios en el checkbox

    }


    /**
     *     Chart.register(ArcElement, PieController);
    Chart.register(ChartDataLabels);

    Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
    setTimeout(() => {
      this.generarRuleta();
    }, 100);

    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupCanvasDrag();
     */


  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('dragover');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    this.imagenesCargadas = [];

    Array.from(files).forEach((file) => this.procesarImagen(file));
  }
  imagenesCargadas: IImagenDto[] = [];
  base64Global = "";
  fileName = "";
  extension = "";

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.imagenesCargadas = [];

    Array.from(files).forEach((file) => this.procesarImagen(file));

  }

  private procesarImagen(file: File): void {
    const nombre = file.name;
    const extension = file.name.split('.').pop() || '';

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Only = base64.split(',')[1]
      const imagenes: IImagenDto = {
        base64: base64Only,
        extension: extension,
        nombreImagen: nombre
      }
      this.imagenesCargadas.push(imagenes);

      // Opcional: mostrar la primera imagen en el canvas
      if (this.imagenesCargadas.length === 1) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          const canvas = this.canvasRef.nativeElement;
          const ctx = canvas.getContext('2d')!;
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, x, y, w, h);
        };
      }
    };
    reader.readAsDataURL(file);
  }

  private drawImage(): void {
    const canvas = this.canvasRef.nativeElement;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const imgWidth = this.img.width;
    const imgHeight = this.img.height;

    // Calcula escala proporcional
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    // Centra la imagen escalada
    this.imgX = (canvasWidth - scaledWidth) / 2;
    this.imgY = (canvasHeight - scaledHeight) / 2;

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.drawImage(this.img, this.imgX, this.imgY, scaledWidth, scaledHeight);
  }


  private setupCanvasDrag(): void {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (
        x >= this.imgX &&
        x <= this.imgX + this.img.width &&
        y >= this.imgY &&
        y <= this.imgY + this.img.height
      ) {
        this.dragging = true;
        this.offsetX = x - this.imgX;
        this.offsetY = y - this.imgY;
      }
    });

    canvas.addEventListener('mouseup', () => (this.dragging = false));

    canvas.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;

      const rect = canvas.getBoundingClientRect();
      this.imgX = e.clientX - rect.left - this.offsetX;
      this.imgY = e.clientY - rect.top - this.offsetY;
      this.drawImage();
    });
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
