import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { IConfigurarRifa } from '../models/configurar-rifa.model';
import { IConcursante } from '../models/concursante.model';
import { IBoletoRifa, PlataformaBoleto } from '../models/boleto-rifa.model';
import { RifaService } from '../service/rifa.service';

@Component({
  selector: 'app-boletos-rifa',
  templateUrl: './boletos-rifa.component.html',
  styleUrls: ['./boletos-rifa.component.scss']
})
export class BoletosRifaComponent implements OnInit {

  rifas: IConfigurarRifa[] = [];
  rifaSeleccionada: IConfigurarRifa | null = null;
  cargandoRifas = false;

  concursantes: IConcursante[] = [];
  filtroNombre = '';
  cargandoConcursantes = false;

  concursanteSeleccionado: IConcursante | null = null;
  boletos: IBoletoRifa[] = [];
  cargandoBoletos = false;

  // ── Rango de fechas en que se aceptan boletos (config de la rifa) ──
  configFechaInicio = '';
  configFechaFin = '';
  editandoRango = false;
  guardandoRango = false;

  // ── Form para registrar un boleto nuevo ────────────────────────────
  plataforma: PlataformaBoleto | '' = '';
  motivo = '';
  fecha = '';
  fechaMin = '';
  fechaMax = '';
  urlPerfilRedSocial = '';
  urlSeguimiento = '';
  urlsCompartido: string[] = [''];
  guardando = false;

  constructor(private readonly rifaService: RifaService) {}

  ngOnInit(): void {
    const rifaIdEstado = history.state?.rifaId as number | undefined;
    this.cargandoRifas = true;
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: res => {
        this.rifas = res;
        this.cargandoRifas = false;
        const inicial = rifaIdEstado
          ? res.find(r => r.id === rifaIdEstado)
          : (res.length === 1 ? res[0] : null);
        if (inicial) this.seleccionarRifa(inicial);
      },
      error: () => { this.cargandoRifas = false; }
    });
  }

  get concursantesFiltrados(): IConcursante[] {
    const termino = this.filtroNombre.trim().toLowerCase();
    if (!termino) return this.concursantes;
    return this.concursantes.filter(c =>
      `${c.nombre} ${c.apellidoPaterno ?? ''}`.toLowerCase().includes(termino)
    );
  }

  onRifaChange(id: number): void {
    const rifa = this.rifas.find(r => r.id === id) ?? null;
    if (rifa) this.seleccionarRifa(rifa);
  }

  seleccionarRifa(rifa: IConfigurarRifa): void {
    this.rifaSeleccionada = rifa;
    this.concursanteSeleccionado = null;
    this.boletos = [];
    this.configFechaInicio = rifa.fechaInicioBoletos ?? '';
    this.configFechaFin = rifa.fechaFinBoletos ?? '';
    this.editandoRango = !rifa.fechaInicioBoletos || !rifa.fechaFinBoletos;
    this.calcularRangoFecha(rifa);
    this.cargandoConcursantes = true;
    this.rifaService.getConcursantesPorRifa(rifa.id!).subscribe({
      next: res => { this.concursantes = res; this.cargandoConcursantes = false; },
      error: () => { this.cargandoConcursantes = false; }
    });
  }

  guardarRangoBoletos(): void {
    if (!this.rifaSeleccionada?.id || !this.configFechaInicio || !this.configFechaFin || this.guardandoRango) return;
    if (this.configFechaInicio > this.configFechaFin) {
      Swal.fire({ icon: 'error', title: 'Rango inválido', text: 'La fecha de inicio no puede ser posterior a la fecha fin.' });
      return;
    }
    this.guardandoRango = true;
    this.rifaService.actualizarConfiguracion(this.rifaSeleccionada.id, {
      fechaInicioBoletos: this.configFechaInicio,
      fechaFinBoletos: this.configFechaFin
    }).subscribe({
      next: res => {
        this.guardandoRango = false;
        this.rifaSeleccionada = res;
        const idx = this.rifas.findIndex(r => r.id === res.id);
        if (idx >= 0) this.rifas[idx] = res;
        this.editandoRango = false;
        this.calcularRangoFecha(res);
      },
      error: err => {
        this.guardandoRango = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar el rango',
          text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  private calcularRangoFecha(rifa: IConfigurarRifa): void {
    if (rifa.fechaInicioBoletos && rifa.fechaFinBoletos) {
      this.fechaMin = rifa.fechaInicioBoletos;
      this.fechaMax = rifa.fechaFinBoletos;
    } else {
      let anio: number; let mes: number; // mes 1-12
      if (rifa.mesReferencia) {
        const [a, m] = rifa.mesReferencia.split('-').map(Number);
        anio = a; mes = m;
      } else {
        const hoy = new Date();
        anio = hoy.getFullYear(); mes = hoy.getMonth() + 1;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      const ultimoDia = new Date(anio, mes, 0).getDate();
      this.fechaMin = `${anio}-${pad(mes)}-01`;
      this.fechaMax = `${anio}-${pad(mes)}-${pad(ultimoDia)}`;
    }
    const hoyStr = new Date().toISOString().slice(0, 10);
    this.fecha = (hoyStr >= this.fechaMin && hoyStr <= this.fechaMax) ? hoyStr : this.fechaMin;
  }

  seleccionarConcursante(c: IConcursante): void {
    this.concursanteSeleccionado = c;
    this.resetForm();
    this.cargandoBoletos = true;
    this.rifaService.getBoletosPorConcursante(c.id!).subscribe({
      next: res => { this.boletos = res; this.cargandoBoletos = false; },
      error: () => { this.cargandoBoletos = false; }
    });
  }

  resetForm(): void {
    this.plataforma = '';
    this.motivo = '';
    this.urlPerfilRedSocial = '';
    this.urlSeguimiento = '';
    this.urlsCompartido = [''];
    if (this.rifaSeleccionada) this.calcularRangoFecha(this.rifaSeleccionada);
  }

  agregarCampoUrl(): void {
    this.urlsCompartido.push('');
  }

  quitarCampoUrl(index: number): void {
    this.urlsCompartido.splice(index, 1);
    if (this.urlsCompartido.length === 0) this.urlsCompartido = [''];
  }

  registrarBoleto(): void {
    if (!this.concursanteSeleccionado?.id || this.guardando) return;
    this.guardando = true;
    this.rifaService.registrarBoleto({
      concursanteId: this.concursanteSeleccionado.id,
      plataforma: this.plataforma || null,
      motivo: this.motivo.trim() || null,
      fecha: this.fecha || null,
      urlPerfilRedSocial: this.urlPerfilRedSocial.trim() || null,
      urlSeguimiento: this.urlSeguimiento.trim() || null,
      urlsCompartido: this.urlsCompartido.map(u => u.trim()).filter(u => !!u)
    }).subscribe({
      next: boleto => {
        this.guardando = false;
        this.boletos = [boleto, ...this.boletos];
        if (this.concursanteSeleccionado) {
          this.concursanteSeleccionado.boletos = (this.concursanteSeleccionado.boletos ?? 0) + 1;
        }
        this.resetForm();
      },
      error: err => {
        this.guardando = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo registrar el boleto',
          text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  eliminarBoleto(b: IBoletoRifa): void {
    if (!b.id) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar este boleto?',
      text: 'Se descontará del total de boletos del concursante.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed || !b.id) return;
      this.rifaService.eliminarBoleto(b.id).subscribe({
        next: () => {
          this.boletos = this.boletos.filter(x => x.id !== b.id);
          if (this.concursanteSeleccionado) {
            this.concursanteSeleccionado.boletos = Math.max(
              this.concursanteSeleccionado.boletosBase ?? 0,
              (this.concursanteSeleccionado.boletos ?? 1) - 1
            );
          }
        },
        error: err => {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo eliminar',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
          });
        }
      });
    });
  }

  nombreCompleto(c?: { nombre?: string; apellidoPaterno?: string } | null): string {
    if (!c) return '';
    return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
  }
}
