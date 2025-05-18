import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Constants } from 'src/app/Constants';
import { ICliente } from 'src/app/clietes/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { IRifa } from './rifa/rifa.model';
import { WebSocketServiceService } from 'src/app/socket/web-socket-service.service';


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

  desHabilitarBotonClic: boolean = false;
  clienteRida: ICliente[] = [];

  palabraRifa: string = 'Rifa';
  constructor(
    private readonly service: ProductoService,
    private readonly webSocketService: WebSocketServiceService

  ) { }

  ngOnInit(): void {
    this.webSocketService.recibirActualizaciones((mensaje: string) => {
      this.datos.push(mensaje); // Recibir y mostrar datos en tiempo real
    });







    this.getDataRifaPorHora();
    const dataExiste = sessionStorage.getItem(Constants.DATA_CLIENTE);
    if (dataExiste != null) {
      this.clienteSave = JSON.parse(sessionStorage.getItem(Constants.DATA_CLIENTE) || "");
      this.ocultarCliente = true;
    }
    this.cargarRuletaRifa();

  }



  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef;
  participantes: IRifa[] = [];
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

    if (this.participantes != null && this.participantes.length > 0) {
      this.chart = new Chart(this.ruletaCanvas.nativeElement, {
        type: 'pie',
        data: {
          labels: this.participantes.map(fil => fil.cliente?.nombrePersona), // Ahora mostrará los nombres correctamente
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
  }

  ocultarComponente(ocultar: boolean): void {

    this.ocultarCliente = ocultar;
  }
iniciarRifa() {
  this.desHabilitarBotonClic = true;
  const ganadorIndex = Math.floor(Math.random() * this.participantes.length);

  // 🔥 Restablecemos la ruleta antes de aplicar una nueva rotación
  this.ruletaCanvas.nativeElement.style.transition = 'none'; // ✅ Eliminamos la animación previa
  this.ruletaCanvas.nativeElement.style.transform = 'rotate(0deg)'; // ✅ Volvemos al estado inicial

  setTimeout(() => {
    // Calculamos el ángulo exacto del ganador
    const anguloPorSegmento = 360 / this.participantes.length;
    const anguloFinal = 360 - (ganadorIndex * anguloPorSegmento + anguloPorSegmento / 2);

    // 🔥 Aplicamos la animación de giro de manera consistente
    this.ruletaCanvas.nativeElement.style.transition = 'transform 2s ease-out';
    this.ruletaCanvas.nativeElement.style.transform = `rotate(${360 * 10 + anguloFinal}deg)`;

    setTimeout(() => {
      alert(`¡Ganador: ${this.participantes[ganadorIndex].cliente.nombrePersona}!`);
      this.desHabilitarBotonClic = false;
    }, 2000);
  }, 100); // ✅ Pequeña pausa para que el reset se aplique correctamente
}


  clienteSave: IRifa[] = [];
  clienteStorage: IRifa = {
    cliente: {
      apeidoMaterno: '',
      apeidoPaterno: '',
      correoElectronico: '',
      nombrePersona: '',
      numeroTelefonico: '',
      segundoNombre: '',
      sexo: '',
      fechaNacimiento: new Date(),
    }
  };

  sesionRegistradaRifa: IRifa = {
    cliente: {
      apeidoMaterno: '',
      apeidoPaterno: '',
      correoElectronico: '',
      nombrePersona: '',
      numeroTelefonico: '',
      segundoNombre: '',
      sexo: '',
      fechaNacimiento: new Date(),
    }
  }
  participarRifa(): void {

    this.guardarRifa();


    // Se va a gusradar el cliente
  }

  cargarRuletaRifa(): void {
    const dataExiste = sessionStorage.getItem(Constants.DATA_CLIENTE);

    if (dataExiste != null) {
      this.clienteStorage = JSON.parse(sessionStorage.getItem(Constants.DATA_CLIENTE) || "");



      //this.participantes = [this.sesionRegistradaRifa ];


      Chart.register(ArcElement, PieController);
      Chart.register(ChartDataLabels);

      Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
      setTimeout(() => {
        this.generarRuleta(this.obetnrColores(this.participantes.length));
      }, 100);

    } else {


      Chart.register(ArcElement, PieController);
      Chart.register(ChartDataLabels);

      Chart.register(ArcElement); // Asegurar que está registrado antes de usarlo
      setTimeout(() => {
        this.generarRuleta(this.obetnrColores(this.participantes.length));
      }, 100);
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

  getDataRifaPorHora() {
    this.service.getClientesRifaPorHora('21:00', '21:15', this.palabraRifa)
      .subscribe({
        next: (res) => {
          this.participantes = res;

          this.cargarRuletaRifa();
        }, error(erro) {
          console.log(erro)
        }
      });
  }


  guardarRifa() {

    const cliente = JSON.parse(sessionStorage.getItem(Constants.DATA_CLIENTE) || "");
    let rifa: IRifa = {
      cliente: cliente
    }

    this.service.saveRifa(rifa)
      .subscribe({
        next: (res) => {
          this.participantes.push(res.data);

          this.participantes.forEach(fro => console.log(fro));
          this.ocultarBtnParticipar = true;
          this.cargarRuletaRifa();
        }, error(erro) {
          console.log(erro)
        }
      });
  }
  datos: string[] = [];


    agregarDato(nuevoDato: string) {
    this.webSocketService.enviarActualizacion(nuevoDato); // Enviar actualización a todos
  }

   mensaje: string = '';
  enviar() {
    this.webSocketService.enviarActualizacion(this.mensaje);
    this.mensaje = ''; // 🔄 Limpiar el campo después de enviar
  }

}
