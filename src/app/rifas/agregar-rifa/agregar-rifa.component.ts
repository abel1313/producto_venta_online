import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Constants } from 'src/app/Constants';
import { ICliente } from 'src/app/clietes/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
Chart.register(ArcElement, PieController, ChartDataLabels);
@Component({
  selector: 'app-agregar-rifa',
  templateUrl: './agregar-rifa.component.html',
  styleUrls: ['./agregar-rifa.component.scss']
})
export class AgregarRifaComponent implements OnInit {

  tituloCliente: string = 'Agregar cliente';
  ocultarCliente: boolean = false;
  ocultarBtnParticipar: boolean = false;
  constructor(
    private readonly service: ProductoService

  ) { }

  ngOnInit(): void {

    this.getDataRifaPorHora();

    this.clienteSave = JSON.parse(sessionStorage.getItem(Constants.DATA_CLIENTE) || "");
    if (this.clienteSave != null) {
      this.ocultarCliente = true;
    }
    this.cargarRuletaRifa();

  }



  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef;
  participantes = ['Juan', 'Ana', 'Carlos', 'Luis', 'Maria'];
  chart!: Chart;

  ngAfterViewInit() {
    Chart.register(ArcElement, PieController);
    Chart.register(ChartDataLabels);

    Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
    setTimeout(() => {
      this.generarRuleta(this.obetnrColores(this.participantes.length));
    }, 100);


  }
  generarRuleta(colores: string[]) {
    if (this.chart) {
      this.chart.destroy(); // Eliminamos instancia previa para evitar errores
    }

    this.chart = new Chart(this.ruletaCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.participantes, // Ahora mostrará los nombres correctamente
        datasets: [{
          data: Array(this.participantes.length).fill(1),
          backgroundColor: [...colores],
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

  ocultarComponente(ocultar: boolean): void {
    console.log("se oculta ", ocultar)
    this.ocultarCliente = ocultar;
  }
  iniciarRifa() {
    const ganadorIndex = Math.floor(Math.random() * this.participantes.length);

    // Calculamos el ángulo exacto del ganador
    const anguloPorSegmento = 360 / this.participantes.length;
    const anguloFinal = 360 - (ganadorIndex * anguloPorSegmento + anguloPorSegmento / 2); // Ajuste para alinearse con el gráfico

    // Aplicamos la animación de giro
    this.ruletaCanvas.nativeElement.style.transition = 'transform 3s ease-out';
    this.ruletaCanvas.nativeElement.style.transform = `rotate(${360 * 15 + anguloFinal}deg)`; // Gira varias veces y se detiene en el ganador

    setTimeout(() => {
      alert("¡Ganador: " + this.participantes[ganadorIndex] + "!");
    }, 3000);
  }

  clienteSave: ICliente = {
    nombrePersona: '',
    segundoNombre: '',
    apeidoPaterno: '',
    apeidoMaterno: '',
    sexo: '',
    correoElectronico: '',
    numeroTelefonico: ''
  }
  participarRifa(): void {
    this.cargarRuletaRifa();
  }

  cargarRuletaRifa(): void{
    this.clienteSave = JSON.parse(sessionStorage.getItem(Constants.DATA_CLIENTE) || "");
    if (this.clienteSave != null) {
      const nombre = `${this.clienteSave.nombrePersona} ${this.clienteSave.segundoNombre} ${this.clienteSave.apeidoPaterno} ${this.clienteSave.apeidoMaterno}`;
      if (!this.participantes.includes(nombre)) {
        this.participantes.push(nombre);
        this.ocultarBtnParticipar = true;
        Chart.register(ArcElement, PieController);
        Chart.register(ChartDataLabels);

        Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
        setTimeout(() => {
          this.generarRuleta(this.obetnrColores(this.participantes.length));
        }, 100);
      }
    }
  }


  obetnrColores(participantes: number) {
    let asignaciones: string[] = [];
    for (let index = 0; index < participantes; index++) {
      asignaciones[index] = this.asignarColores();
    }
    return asignaciones;
  }
  asignarColores(): string {
    let letters = '0123456789ABCDEF'.split('');
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getDataRifaPorHora(){
    this.service.getClientesRifaPorHora('21:00','21:15')
    .subscribe({
      next:(res)=>{
        console.log(res)
      },error(erro){
        console.log(erro)
      }
    });
  }


}
